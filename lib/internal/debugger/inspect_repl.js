'use strict';
const { ERR_DEBUGGER_ERROR } = require('internal/errors').codes;
const { validateString, validateNumber } = require('internal/validators');
const FS = require('fs');
const Path = require('path');
const Repl = require('repl');
const vm = require('vm');
const { fileURLToPath } = require('internal/url');
const { customInspectSymbol, SideEffectFreeRegExpPrototypeSymbolReplace } = require('internal/util');
const { inspect: utilInspect } = require('internal/util/inspect');
const debuglog = require('internal/util/debuglog').debuglog('inspect');
const SHORTCUTS = {
    cont: 'c',
    next: 'n',
    step: 's',
    out: 'o',
    backtrace: 'bt',
    setBreakpoint: 'sb',
    clearBreakpoint: 'cb',
    run: 'r',
    exec: 'p',
};
const HELP = `
run, restart, r       Run the application or reconnect
kill                  Kill a running application or disconnect

cont, c               Resume execution
next, n               Continue to next line in current file
step, s               Step into, potentially entering a function
out, o                Step out, leaving the current function
backtrace, bt         Print the current backtrace
list                  Print the source around the current line where execution
                      is currently paused
setContextLineNumber  Set which lines to check for context
setBreakpoint, sb     Set a breakpoint
clearBreakpoint, cb   Clear a breakpoint
breakpoints           List all known breakpoints
breakOnException      Pause execution whenever an exception is thrown
breakOnUncaught       Pause execution whenever an exception isn't caught
breakOnNone           Don't pause on exceptions (this is the default)

watch(expr)           Start watching the given expression
unwatch(expr)         Stop watching an expression
unwatch(index)        Stop watching an expression at specific index from watch list
watchers              Print all watched expressions and their current values

exec(expr), p(expr), exec expr, p expr
                      Evaluate the expression and print the value
repl                  Enter a debug repl that works like exec

scripts               List application scripts that are currently loaded
scripts(true)         List all scripts (including node-internals)

profile               Start CPU profiling session.
profileEnd            Stop current CPU profiling session.
profiles              Array of completed CPU profiling sessions.
profiles[n].save(filepath = 'node.cpuprofile')
                      Save CPU profiling session to disk as JSON.

takeHeapSnapshot(filepath = 'node.heapsnapshot')
                      Take a heap snapshot and save to disk as JSON.
`.trim();
const FUNCTION_NAME_PATTERN = /^(?:function\*? )?([^(\s]+)\(/;
function extractFunctionName(description) {
    const fnNameMatch = FUNCTION_NAME_PATTERN.exec(description);
    return fnNameMatch ? `: ${fnNameMatch[1]}` : '';
}
const { builtinIds } = internalBinding('builtins');
function isNativeUrl(url) {
    url = SideEffectFreeRegExpPrototypeSymbolReplace(/\.js$/, url, '');
    return url.startsWith('node:internal/') || builtinIds.includes(url);
}
function getRelativePath(filenameOrURL) {
    const dir = Path.join(Path.resolve(), 'x').slice(0, -1);
    const filename = filenameOrURL.startsWith('file://') ?
        fileURLToPath(filenameOrURL) : filenameOrURL;
    // Change path to relative, if possible
    if (filename.startsWith(dir)) {
        return filename.slice(dir.length);
    }
    return filename;
}
// Adds spaces and prefix to number
// maxN is a maximum number we should have space for
function leftPad(n, prefix, maxN) {
    const s = n.toString();
    const nchars = Math.max(2, String(maxN).length);
    const nspaces = nchars - s.length;
    return prefix + ' '.repeat(nspaces) + s;
}
function markSourceColumn(sourceText, position, useColors) {
    if (!sourceText)
        return '';
    const head = sourceText.slice(0, position);
    let tail = sourceText.slice(position);
    // Colourize char if stdout supports colours
    if (useColors) {
        tail = SideEffectFreeRegExpPrototypeSymbolReplace(/(.+?)([^\w]|$)/, tail, '\u001b[32m$1\u001b[39m$2');
    }
    // Return source line with coloured char at `position`
    return head + tail;
}
function extractErrorMessage(stack) {
    if (!stack)
        return '<unknown>';
    const m = /^\w+: ([^\n]+)/.exec(stack);
    return m?.[1] ?? stack;
}
function convertResultToError(result) {
    const { className, description } = result;
    const err = new ERR_DEBUGGER_ERROR(extractErrorMessage(description));
    err.stack = description;
    Object.defineProperty(err, 'name', { value: className });
    return err;
}
class PropertyPreview {
    constructor(attributes) {
        Object.assign(this, attributes);
    }
    [customInspectSymbol](depth, opts) {
        switch (this.type) {
            case 'string':
            case 'undefined':
                return utilInspect(this.value, opts);
            case 'number':
            case 'boolean':
                return opts.stylize(this.value, this.type);
            case 'object':
            case 'symbol':
                if (this.subtype === 'date') {
                    return utilInspect(new Date(this.value), opts);
                }
                if (this.subtype === 'array') {
                    return opts.stylize(this.value, 'special');
                }
                return opts.stylize(this.value, this.subtype || 'special');
            default:
                return this.value;
        }
    }
}
class ObjectPreview {
    constructor(attributes) {
        Object.assign(this, attributes);
    }
    [customInspectSymbol](depth, opts) {
        switch (this.type) {
            case 'object': {
                switch (this.subtype) {
                    case 'date':
                        return utilInspect(new Date(this.description), opts);
                    case 'null':
                        return utilInspect(null, opts);
                    case 'regexp':
                        return opts.stylize(this.description, 'regexp');
                    case 'set': {
                        if (!this.entries) {
                            return `${this.description} ${this.overflow ? '{ ... }' : '{}'}`;
                        }
                        const values = this.entries.map((entry) => utilInspect(new ObjectPreview(entry.value), opts));
                        return `${this.description} { ${values.join(', ')} }`;
                    }
                    case 'map': {
                        if (!this.entries) {
                            return `${this.description} ${this.overflow ? '{ ... }' : '{}'}`;
                        }
                        const mappings = this.entries.map((entry) => {
                            const key = utilInspect(new ObjectPreview(entry.key), opts);
                            const value = utilInspect(new ObjectPreview(entry.value), opts);
                            return `${key} => ${value}`;
                        });
                        return `${this.description} { ${mappings.join(', ')} }`;
                    }
                    case 'array':
                    case undefined: {
                        if (this.properties.length === 0) {
                            return this.subtype === 'array' ? '[]' : '{}';
                        }
                        const props = this.properties.map((prop, idx) => {
                            const value = utilInspect(new PropertyPreview(prop));
                            if (prop.name === `${idx}`)
                                return value;
                            return `${prop.name}: ${value}`;
                        });
                        if (this.overflow) {
                            props.push('...');
                        }
                        const singleLine = props.join(', ');
                        const propString = singleLine.length > 60 ? props.join(',\n  ') : singleLine;
                        return this.subtype === 'array' ? `[ ${propString} ]` : `{ ${propString} }`;
                    }
                    default:
                        return this.description;
                }
            }
            default:
                return this.description;
        }
    }
}
class RemoteObject {
    constructor(attributes) {
        Object.assign(this, attributes);
        if (this.type === 'number') {
            this.value =
                this.unserializableValue ? +this.unserializableValue : +this.value;
        }
    }
    [customInspectSymbol](depth, opts) {
        switch (this.type) {
            case 'boolean':
            case 'number':
            case 'string':
            case 'undefined':
                return utilInspect(this.value, opts);
            case 'symbol':
                return opts.stylize(this.description, 'special');
            case 'function': {
                const fnName = extractFunctionName(this.description);
                const formatted = `[${this.className}${fnName}]`;
                return opts.stylize(formatted, 'special');
            }
            case 'object':
                switch (this.subtype) {
                    case 'date':
                        return utilInspect(new Date(this.description), opts);
                    case 'null':
                        return utilInspect(null, opts);
                    case 'regexp':
                        return opts.stylize(this.description, 'regexp');
                    case 'map':
                    case 'set': {
                        const preview = utilInspect(new ObjectPreview(this.preview), opts);
                        return `${this.description} ${preview}`;
                    }
                    default:
                        break;
                }
                if (this.preview) {
                    return utilInspect(new ObjectPreview(this.preview), opts);
                }
                return this.description;
            default:
                return this.description;
        }
    }
    static fromEvalResult({ result, wasThrown }) {
        if (wasThrown)
            return convertResultToError(result);
        return new RemoteObject(result);
    }
}
class ScopeSnapshot {
    constructor(scope, properties) {
        Object.assign(this, scope);
        this.properties = new Map();
        this.completionGroup = properties.map((prop) => {
            const value = new RemoteObject(prop.value);
            this.properties.set(prop.name, value);
            return prop.name;
        });
    }
    [customInspectSymbol](depth, opts) {
        const type = this.type[0].toUpperCase() + this.type.slice(1);
        const name = this.name ? `<${this.name}>` : '';
        const prefix = `${type}${name} `;
        return SideEffectFreeRegExpPrototypeSymbolReplace(/^Map /, utilInspect(this.properties, opts), prefix);
    }
}
function copyOwnProperties(target, source) {
    Reflect.ownKeys(source).forEach((prop) => {
        const desc = Reflect.getOwnPropertyDescriptor(source, prop);
        Object.defineProperty(target, prop, desc);
    });
}
function aliasProperties(target, mapping) {
    Object.keys(mapping).forEach((key) => {
        const desc = Reflect.getOwnPropertyDescriptor(target, key);
        Object.defineProperty(target, mapping[key], desc);
    });
}
function createRepl(inspector) {
    const { Debugger, HeapProfiler, Profiler, Runtime } = inspector;
    let repl;
    // Things we want to keep around
    const history = { control: [], debug: [] };
    const watchedExpressions = [];
    const knownBreakpoints = [];
    let heapSnapshotPromise = null;
    let pauseOnExceptionState = 'none';
    let lastCommand;
    // Things we need to reset when the app restarts
    let knownScripts;
    let currentBacktrace;
    let selectedFrame;
    let exitDebugRepl;
    let contextLineNumber = 2;
    function resetOnStart() {
        knownScripts = {};
        currentBacktrace = null;
        selectedFrame = null;
        if (exitDebugRepl)
            exitDebugRepl();
        exitDebugRepl = null;
    }
    resetOnStart();
    const INSPECT_OPTIONS = { colors: inspector.stdout.isTTY };
    function inspect(value) {
        return utilInspect(value, INSPECT_OPTIONS);
    }
    function print(value, addNewline = true) {
        const text = typeof value === 'string' ? value : inspect(value);
        return inspector.print(text, addNewline);
    }
    function getCurrentLocation() {
        if (!selectedFrame) {
            throw new ERR_DEBUGGER_ERROR('Requires execution to be paused');
        }
        return selectedFrame.location;
    }
    function isCurrentScript(script) {
        return selectedFrame && getCurrentLocation().scriptId === script.scriptId;
    }
    function formatScripts(displayNatives = false) {
        function isVisible(script) {
            if (displayNatives)
                return true;
            return !script.isNative || isCurrentScript(script);
        }
        return Object.values(knownScripts).filter(isVisible).map((script) => {
            const isCurrent = isCurrentScript(script);
            const { isNative, url } = script;
            const name = `${getRelativePath(url)}${isNative ? ' <native>' : ''}`;
            return `${isCurrent ? '*' : ' '} ${script.scriptId}: ${name}`;
        }).join('\n');
    }
    function listScripts(displayNatives = false) {
        print(formatScripts(displayNatives));
    }
    listScripts[customInspectSymbol] = function listWithoutInternal() {
        return formatScripts();
    };
    const profiles = [];
    class Profile {
        constructor(data) {
            this.data = data;
        }
        static createAndRegister({ profile }) {
            const p = new Profile(profile);
            profiles.push(p);
            return p;
        }
        [customInspectSymbol](depth, { stylize }) {
            const { startTime, endTime } = this.data;
            const MU = String.fromCharCode(956);
            return stylize(`[Profile ${endTime - startTime}${MU}s]`, 'special');
        }
        save(filename = 'node.cpuprofile') {
            const absoluteFile = Path.resolve(filename);
            const json = JSON.stringify(this.data);
            FS.writeFileSync(absoluteFile, json);
            print('Saved profile to ' + absoluteFile);
        }
    }
    class SourceSnippet {
        constructor(location, delta, scriptSource) {
            Object.assign(this, location);
            this.scriptSource = scriptSource;
            this.delta = delta;
        }
        [customInspectSymbol](depth, options) {
            const { scriptId, lineNumber, columnNumber, delta, scriptSource } = this;
            const start = Math.max(1, lineNumber - delta + 1);
            const end = lineNumber + delta + 1;
            const lines = scriptSource.split('\n');
            return lines.slice(start - 1, end).map((lineText, offset) => {
                const i = start + offset;
                const isCurrent = i === (lineNumber + 1);
                const markedLine = isCurrent ?
                    markSourceColumn(lineText, columnNumber, options.colors) :
                    lineText;
                let isBreakpoint = false;
                knownBreakpoints.forEach(({ location }) => {
                    if (!location)
                        return;
                    if (scriptId === location.scriptId &&
                        i === (location.lineNumber + 1)) {
                        isBreakpoint = true;
                    }
                });
                let prefixChar = ' ';
                if (isCurrent) {
                    prefixChar = '>';
                }
                else if (isBreakpoint) {
                    prefixChar = '*';
                }
                return `${leftPad(i, prefixChar, end)} ${markedLine}`;
            }).join('\n');
        }
    }
    async function getSourceSnippet(location, delta = 5) {
        const { scriptId } = location;
        const { scriptSource } = await Debugger.getScriptSource({ scriptId });
        return new SourceSnippet(location, delta, scriptSource);
    }
    class CallFrame {
        constructor(callFrame) {
            Object.assign(this, callFrame);
        }
        loadScopes() {
            return Promise.all(this.scopeChain.filter((scope) => scope.type !== 'global').map(async (scope) => {
                const { objectId } = scope.object;
                const { result } = await Runtime.getProperties({
                    objectId,
                    generatePreview: true,
                });
                return new ScopeSnapshot(scope, result);
            }));
        }
        list(delta = 5) {
            return getSourceSnippet(this.location, delta);
        }
    }
    class Backtrace extends Array {
        [customInspectSymbol]() {
            return this.map((callFrame, idx) => {
                const { location: { scriptId, lineNumber, columnNumber }, functionName, } = callFrame;
                const name = functionName || '(anonymous)';
                const script = knownScripts[scriptId];
                const relativeUrl = (script && getRelativePath(script.url)) || '<unknown>';
                const frameLocation = `${relativeUrl}:${lineNumber + 1}:${columnNumber}`;
                return `#${idx} ${name} ${frameLocation}`;
            }).join('\n');
        }
        static from(callFrames) {
            return Array.from.call(this, callFrames, (callFrame) => (callFrame instanceof CallFrame ?
                callFrame :
                new CallFrame(callFrame)));
        }
    }
    function prepareControlCode(input) {
        if (input === '\n')
            return lastCommand;
        // Add parentheses: exec process.title => exec("process.title");
        const match = /^\s*(?:exec|p)\s+([^\n]*)/.exec(input);
        if (match) {
            lastCommand = `exec(${JSON.stringify(match[1])})`;
        }
        else {
            lastCommand = input;
        }
        return lastCommand;
    }
    async function evalInCurrentContext(code) {
        // Repl asked for scope variables
        if (code === '.scope') {
            if (!selectedFrame) {
                throw new ERR_DEBUGGER_ERROR('Requires execution to be paused');
            }
            const scopes = await selectedFrame.loadScopes();
            return scopes.map((scope) => scope.completionGroup);
        }
        if (selectedFrame) {
            return Debugger.evaluateOnCallFrame({
                callFrameId: selectedFrame.callFrameId,
                expression: code,
                objectGroup: 'node-inspect',
                generatePreview: true,
            }).then(RemoteObject.fromEvalResult);
        }
        return Runtime.evaluate({
            expression: code,
            objectGroup: 'node-inspect',
            generatePreview: true,
        }).then(RemoteObject.fromEvalResult);
    }
    function controlEval(input, context, filename, callback) {
        debuglog('eval:', input);
        function returnToCallback(error, result) {
            debuglog('end-eval:', input, error);
            callback(error, result);
        }
        try {
            const code = prepareControlCode(input);
            const result = vm.runInContext(code, context, filename);
            const then = result?.then;
            if (typeof then === 'function') {
                then.call(result, (result) => returnToCallback(null, result), returnToCallback);
            }
            else {
                returnToCallback(null, result);
            }
        }
        catch (e) {
            returnToCallback(e);
        }
    }
    function debugEval(input, context, filename, callback) {
        debuglog('eval:', input);
        function returnToCallback(error, result) {
            debuglog('end-eval:', input, error);
            callback(error, result);
        }
        evalInCurrentContext(input).then((result) => returnToCallback(null, result), returnToCallback);
    }
    async function formatWatchers(verbose = false) {
        if (!watchedExpressions.length) {
            return '';
        }
        const inspectValue = (expr) => evalInCurrentContext(expr).then(undefined, (error) => `<${error.message}>`);
        const lastIndex = watchedExpressions.length - 1;
        const values = await Promise.all(watchedExpressions.map(inspectValue));
        const lines = watchedExpressions.map((expr, idx) => {
            const prefix = `${leftPad(idx, ' ', lastIndex)}: ${expr} =`;
            const value = inspect(values[idx]);
            if (!value.includes('\n')) {
                return `${prefix} ${value}`;
            }
            return `${prefix}\n    ${value.replaceAll('\n', '\n    ')}`;
        });
        const valueList = lines.join('\n');
        return verbose ? `Watchers:\n${valueList}\n` : valueList;
    }
    function watchers(verbose = false) {
        return formatWatchers(verbose).then(print);
    }
    // List source code
    function list(delta = 5) {
        if (!selectedFrame) {
            throw new ERR_DEBUGGER_ERROR('Requires execution to be paused');
        }
        return selectedFrame.list(delta).then(null, (error) => {
            print("You can't list source code right now");
            throw error;
        });
    }
    function setContextLineNumber(delta = 2) {
        if (!selectedFrame) {
            throw new ERR_DEBUGGER_ERROR('Requires execution to be paused');
        }
        validateNumber(delta, 'delta', 1);
        contextLineNumber = delta;
        print(`The contextLine has been changed to ${delta}.`);
    }
    function handleBreakpointResolved({ breakpointId, location }) {
        const script = knownScripts[location.scriptId];
        const scriptUrl = script && script.url;
        if (scriptUrl) {
            Object.assign(location, { scriptUrl });
        }
        const isExisting = knownBreakpoints.some((bp) => {
            if (bp.breakpointId === breakpointId) {
                Object.assign(bp, { location });
                return true;
            }
            return false;
        });
        if (!isExisting) {
            knownBreakpoints.push({ breakpointId, location });
        }
    }
    function listBreakpoints() {
        if (!knownBreakpoints.length) {
            print('No breakpoints yet');
            return;
        }
        function formatLocation(location) {
            if (!location)
                return '<unknown location>';
            const script = knownScripts[location.scriptId];
            const scriptUrl = script ? script.url : location.scriptUrl;
            return `${getRelativePath(scriptUrl)}:${location.lineNumber + 1}`;
        }
        const breaklist = knownBreakpoints.map((bp, idx) => `#${idx} ${formatLocation(bp.location)}`).join('\n');
        print(breaklist);
    }
    function setBreakpoint(script, line, condition, silent) {
        function registerBreakpoint({ breakpointId, actualLocation }) {
            handleBreakpointResolved({ breakpointId, location: actualLocation });
            if (actualLocation && actualLocation.scriptId) {
                if (!silent)
                    return getSourceSnippet(actualLocation, 5);
            }
            else {
                print(`Warning: script '${script}' was not loaded yet.`);
            }
            return undefined;
        }
        // setBreakpoint(): set breakpoint at current location
        if (script === undefined) {
            return Debugger.setBreakpoint({ location: getCurrentLocation(), condition }).then(registerBreakpoint);
        }
        // setBreakpoint(line): set breakpoint in current script at specific line
        if (line === undefined && typeof script === 'number') {
            const location = {
                scriptId: getCurrentLocation().scriptId,
                lineNumber: script - 1,
            };
            return Debugger.setBreakpoint({ location, condition }).then(registerBreakpoint);
        }
        validateString(script, 'script');
        // setBreakpoint('fn()'): Break when a function is called
        if (script.endsWith('()')) {
            const debugExpr = `debug(${script.slice(0, -2)})`;
            const debugCall = selectedFrame ?
                Debugger.evaluateOnCallFrame({
                    callFrameId: selectedFrame.callFrameId,
                    expression: debugExpr,
                    includeCommandLineAPI: true,
                }) :
                Runtime.evaluate({
                    expression: debugExpr,
                    includeCommandLineAPI: true,
                });
            return debugCall.then(({ result, wasThrown }) => {
                if (wasThrown)
                    return convertResultToError(result);
                return undefined; // This breakpoint can't be removed the same way
            });
        }
        // setBreakpoint('scriptname')
        let scriptId = null;
        let ambiguous = false;
        if (knownScripts[script]) {
            scriptId = script;
        }
        else {
            Object.keys(knownScripts).forEach((id) => {
                const scriptUrl = knownScripts[id].url;
                if (scriptUrl && scriptUrl.includes(script)) {
                    if (scriptId !== null) {
                        ambiguous = true;
                    }
                    scriptId = id;
                }
            });
        }
        if (ambiguous) {
            print('Script name is ambiguous');
            return undefined;
        }
        if (line <= 0) {
            print('Line should be a positive value');
            return undefined;
        }
        if (scriptId !== null) {
            const location = { scriptId, lineNumber: line - 1 };
            return Debugger.setBreakpoint({ location, condition }).then(registerBreakpoint);
        }
        const escapedPath = SideEffectFreeRegExpPrototypeSymbolReplace(/([/\\.?*()^${}|[\]])/g, script, '\\$1');
        const urlRegex = `^(.*[\\/\\\\])?${escapedPath}$`;
        return Debugger.setBreakpointByUrl({
            urlRegex,
            lineNumber: line - 1,
            condition,
        }).then((bp) => {
            // TODO: handle bp.locations in case the regex matches existing files
            if (!bp.location) { // Fake it for now.
                Object.assign(bp, {
                    actualLocation: {
                        scriptUrl: `.*/${script}$`,
                        lineNumber: line - 1,
                    },
                });
            }
            return registerBreakpoint(bp);
        });
    }
    function clearBreakpoint(url, line) {
        const breakpoint = knownBreakpoints.find(({ location }) => {
            if (!location)
                return false;
            const script = knownScripts[location.scriptId];
            if (!script)
                return false;
            return (script.url.includes(url) &&
                (location.lineNumber + 1) === line);
        });
        if (!breakpoint) {
            print(`Could not find breakpoint at ${url}:${line}`);
            return Promise.resolve();
        }
        return Debugger.removeBreakpoint({ breakpointId: breakpoint.breakpointId }).then(() => {
            const idx = knownBreakpoints.indexOf(breakpoint);
            knownBreakpoints.splice(idx, 1);
        });
    }
    function restoreBreakpoints() {
        const lastBreakpoints = knownBreakpoints.splice(0);
        const newBreakpoints = lastBreakpoints.filter(({ location }) => !!location.scriptUrl).map(({ location }) => setBreakpoint(location.scriptUrl, location.lineNumber + 1));
        if (!newBreakpoints.length)
            return Promise.resolve();
        return Promise.all(newBreakpoints).then(() => {
            print(`${newBreakpoints.length} breakpoints restored.`);
        });
    }
    function setPauseOnExceptions(state) {
        return Debugger.setPauseOnExceptions({ state }).then(() => {
            pauseOnExceptionState = state;
        });
    }
    Debugger.on('paused', ({ callFrames, reason /* , hitBreakpoints */ }) => {
        if (process.env.NODE_INSPECT_RESUME_ON_START === '1' &&
            reason === 'Break on start') {
            debuglog('Paused on start, but NODE_INSPECT_RESUME_ON_START' +
                ' environment variable is set to 1, resuming');
            inspector.client.callMethod('Debugger.resume');
            return;
        }
        // Save execution context's data
        currentBacktrace = Backtrace.from(callFrames);
        selectedFrame = currentBacktrace[0];
        const { scriptId, lineNumber } = selectedFrame.location;
        const breakType = reason === 'other' ? 'break' : reason;
        const script = knownScripts[scriptId];
        const scriptUrl = script ? getRelativePath(script.url) : '[unknown]';
        const header = `${breakType} in ${scriptUrl}:${lineNumber + 1}`;
        inspector.suspendReplWhile(() => Promise.all([formatWatchers(true), selectedFrame.list(contextLineNumber)]).then(({ 0: watcherList, 1: context }) => {
            const breakContext = watcherList ?
                `${watcherList}\n${inspect(context)}` :
                inspect(context);
            print(`${header}\n${breakContext}`);
        }));
    });
    function handleResumed() {
        currentBacktrace = null;
        selectedFrame = null;
    }
    Debugger.on('resumed', handleResumed);
    Debugger.on('breakpointResolved', handleBreakpointResolved);
    Debugger.on('scriptParsed', (script) => {
        const { scriptId, url } = script;
        if (url) {
            knownScripts[scriptId] = { isNative: isNativeUrl(url), ...script };
        }
    });
    Profiler.on('consoleProfileFinished', ({ profile }) => {
        Profile.createAndRegister({ profile });
        print('Captured new CPU profile.\n' +
            `Access it with profiles[${profiles.length - 1}]`);
    });
    function initializeContext(context) {
        inspector.domainNames.forEach((domain) => {
            Object.defineProperty(context, domain, {
                value: inspector[domain],
                enumerable: true,
                configurable: true,
                writeable: false
            });
        });
        copyOwnProperties(context, {
            get help() {
                return print(HELP);
            },
            get run() {
                return inspector.run();
            },
            get kill() {
                return inspector.killChild();
            },
            get restart() {
                return inspector.run();
            },
            get cont() {
                handleResumed();
                return Debugger.resume();
            },
            get next() {
                handleResumed();
                return Debugger.stepOver();
            },
            get step() {
                handleResumed();
                return Debugger.stepInto();
            },
            get out() {
                handleResumed();
                return Debugger.stepOut();
            },
            get pause() {
                return Debugger.pause();
            },
            get backtrace() {
                return currentBacktrace;
            },
            get breakpoints() {
                return listBreakpoints();
            },
            exec(expr) {
                return evalInCurrentContext(expr);
            },
            get profile() {
                return Profiler.start();
            },
            get profileEnd() {
                return Profiler.stop().then(Profile.createAndRegister);
            },
            get profiles() {
                return profiles;
            },
            takeHeapSnapshot(filename = 'node.heapsnapshot') {
                if (heapSnapshotPromise) {
                    print('Cannot take heap snapshot because another snapshot is in progress.');
                    return heapSnapshotPromise;
                }
                heapSnapshotPromise = new Promise((resolve, reject) => {
                    const absoluteFile = Path.resolve(filename);
                    const writer = FS.createWriteStream(absoluteFile);
                    let sizeWritten = 0;
                    function onProgress({ done, total, finished }) {
                        if (finished) {
                            print('Heap snapshot prepared.');
                        }
                        else {
                            print(`Heap snapshot: ${done}/${total}`, false);
                        }
                    }
                    function onChunk({ chunk }) {
                        sizeWritten += chunk.length;
                        writer.write(chunk);
                        print(`Writing snapshot: ${sizeWritten}`, false);
                    }
                    function onResolve() {
                        writer.end(() => {
                            teardown();
                            print(`Wrote snapshot: ${absoluteFile}`);
                            heapSnapshotPromise = null;
                            resolve();
                        });
                    }
                    function onReject(error) {
                        teardown();
                        reject(error);
                    }
                    function teardown() {
                        HeapProfiler.removeListener('reportHeapSnapshotProgress', onProgress);
                        HeapProfiler.removeListener('addHeapSnapshotChunk', onChunk);
                    }
                    HeapProfiler.on('reportHeapSnapshotProgress', onProgress);
                    HeapProfiler.on('addHeapSnapshotChunk', onChunk);
                    print('Heap snapshot: 0/0', false);
                    HeapProfiler.takeHeapSnapshot({ reportProgress: true }).then(onResolve, onReject);
                });
                return heapSnapshotPromise;
            },
            get watchers() {
                return watchers();
            },
            watch(expr) {
                validateString(expr, 'expression');
                watchedExpressions.push(expr);
            },
            unwatch(expr) {
                const index = watchedExpressions.indexOf(expr);
                // Unwatch by expression
                // or
                // Unwatch by watcher number
                watchedExpressions.splice(index !== -1 ? index : +expr, 1);
            },
            get repl() {
                // Don't display any default messages
                const listeners = repl.listeners('SIGINT').slice();
                repl.removeAllListeners('SIGINT');
                const oldContext = repl.context;
                exitDebugRepl = () => {
                    // Restore all listeners
                    process.nextTick(() => {
                        listeners.forEach((listener) => {
                            repl.on('SIGINT', listener);
                        });
                    });
                    // Exit debug repl
                    repl.eval = controlEval;
                    // Swap history
                    history.debug = repl.history;
                    repl.history = history.control;
                    repl.context = oldContext;
                    repl.setPrompt('debug> ');
                    repl.displayPrompt();
                    repl.removeListener('SIGINT', exitDebugRepl);
                    repl.removeListener('exit', exitDebugRepl);
                    exitDebugRepl = null;
                };
                // Exit debug repl on SIGINT
                repl.on('SIGINT', exitDebugRepl);
                // Exit debug repl on repl exit
                repl.on('exit', exitDebugRepl);
                // Set new
                repl.eval = debugEval;
                repl.context = {};
                // Swap history
                history.control = repl.history;
                repl.history = history.debug;
                repl.setPrompt('> ');
                print('Press Ctrl+C to leave debug repl');
                return repl.displayPrompt();
            },
            get version() {
                return Runtime.evaluate({
                    expression: 'process.versions.v8',
                    contextId: 1,
                    returnByValue: true,
                }).then(({ result }) => {
                    print(result.value);
                });
            },
            scripts: listScripts,
            setBreakpoint,
            clearBreakpoint,
            setPauseOnExceptions,
            get breakOnException() {
                return setPauseOnExceptions('all');
            },
            get breakOnUncaught() {
                return setPauseOnExceptions('uncaught');
            },
            get breakOnNone() {
                return setPauseOnExceptions('none');
            },
            list,
            setContextLineNumber,
        });
        aliasProperties(context, SHORTCUTS);
    }
    async function initAfterStart() {
        await Runtime.enable();
        await Profiler.enable();
        await Profiler.setSamplingInterval({ interval: 100 });
        await Debugger.enable();
        await Debugger.setAsyncCallStackDepth({ maxDepth: 0 });
        await Debugger.setBlackboxPatterns({ patterns: [] });
        await Debugger.setPauseOnExceptions({ state: pauseOnExceptionState });
        await restoreBreakpoints();
        return Runtime.runIfWaitingForDebugger();
    }
    return async function startRepl() {
        inspector.client.on('close', () => {
            resetOnStart();
        });
        inspector.client.on('ready', () => {
            initAfterStart();
        });
        // Init once for the initial connection
        await initAfterStart();
        const replOptions = {
            prompt: 'debug> ',
            input: inspector.stdin,
            output: inspector.stdout,
            eval: controlEval,
            useGlobal: false,
            ignoreUndefined: true,
        };
        repl = Repl.start(replOptions);
        initializeContext(repl.context);
        repl.on('reset', initializeContext);
        repl.defineCommand('interrupt', () => {
            // We want this for testing purposes where sending Ctrl+C can be tricky.
            repl.emit('SIGINT');
        });
        return repl;
    };
}
module.exports = createRepl;
