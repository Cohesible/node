'use strict';
const { ErrnoException, codes: { ERR_ASSERTION, ERR_INVALID_ARG_TYPE, ERR_INVALID_ARG_VALUE, ERR_OUT_OF_RANGE, ERR_UNKNOWN_SIGNAL, }, } = require('internal/errors');
const format = require('internal/util/inspect').format;
const { validateArray, validateNumber, validateObject, } = require('internal/validators');
const { getValidatedPath } = require('internal/fs/utils');
const { toNamespacedPath } = require('path');
const constants = internalBinding('constants').os.signals;
const kInternal = Symbol('internal properties');
function assert(x, msg) {
    if (!x)
        throw new ERR_ASSERTION(msg || 'assertion error');
}
const { exitCodes: { kNoFailure } } = internalBinding('errors');
const binding = internalBinding('process_methods');
// The 3 entries filled in by the original process.hrtime contains
// the upper/lower 32 bits of the second part of the value,
// and the remaining nanoseconds of the value.
const hrValues = binding.hrtimeBuffer;
// Use a BigUint64Array because this is actually a bit
// faster than simply returning a BigInt from C++ in V8 7.1.
const hrBigintValues = new BigUint64Array(binding.hrtimeBuffer.buffer, 0, 1);
function hrtime(time) {
    binding.hrtime();
    if (time !== undefined) {
        validateArray(time, 'time');
        if (time.length !== 2) {
            throw new ERR_OUT_OF_RANGE('time', 2, time.length);
        }
        const sec = (hrValues[0] * 0x100000000 + hrValues[1]) - time[0];
        const nsec = hrValues[2] - time[1];
        const needsBorrow = nsec < 0;
        return [needsBorrow ? sec - 1 : sec, needsBorrow ? nsec + 1e9 : nsec];
    }
    return [
        hrValues[0] * 0x100000000 + hrValues[1],
        hrValues[2],
    ];
}
function hrtimeBigInt() {
    binding.hrtimeBigInt();
    return hrBigintValues[0];
}
function nop() { }
// The execution of this function itself should not cause any side effects.
function wrapProcessMethods(binding) {
    const { cpuUsage: _cpuUsage, memoryUsage: _memoryUsage, rss, resourceUsage: _resourceUsage, loadEnvFile: _loadEnvFile, } = binding;
    function _rawDebug(...args) {
        binding._rawDebug(Reflect.apply(format, null, args));
    }
    // Create the argument array that will be passed to the native function.
    const cpuValues = new Float64Array(2);
    // Replace the native function with the JS version that calls the native
    // function.
    function cpuUsage(prevValue) {
        // If a previous value was passed in, ensure it has the correct shape.
        if (prevValue) {
            if (!previousValueIsValid(prevValue.user)) {
                validateObject(prevValue, 'prevValue');
                validateNumber(prevValue.user, 'prevValue.user');
                throw new ERR_INVALID_ARG_VALUE.RangeError('prevValue.user', prevValue.user);
            }
            if (!previousValueIsValid(prevValue.system)) {
                validateNumber(prevValue.system, 'prevValue.system');
                throw new ERR_INVALID_ARG_VALUE.RangeError('prevValue.system', prevValue.system);
            }
        }
        // Call the native function to get the current values.
        _cpuUsage(cpuValues);
        // If a previous value was passed in, return diff of current from previous.
        if (prevValue) {
            return {
                user: cpuValues[0] - prevValue.user,
                system: cpuValues[1] - prevValue.system,
            };
        }
        // If no previous value passed in, return current value.
        return {
            user: cpuValues[0],
            system: cpuValues[1],
        };
    }
    // Ensure that a previously passed in value is valid. Currently, the native
    // implementation always returns numbers <= Number.MAX_SAFE_INTEGER.
    function previousValueIsValid(num) {
        return typeof num === 'number' &&
            num <= Number.MAX_SAFE_INTEGER &&
            num >= 0;
    }
    const memValues = new Float64Array(5);
    function memoryUsage() {
        _memoryUsage(memValues);
        return {
            rss: memValues[0],
            heapTotal: memValues[1],
            heapUsed: memValues[2],
            external: memValues[3],
            arrayBuffers: memValues[4],
        };
    }
    memoryUsage.rss = rss;
    function exit(code) {
        const { handleProcessExit, } = require('internal/modules/esm/handle_process_exit');
        process.off('exit', handleProcessExit);
        if (arguments.length !== 0) {
            process.exitCode = code;
        }
        if (!process._exiting) {
            process._exiting = true;
            process.emit('exit', process.exitCode || kNoFailure);
        }
        // FIXME(joyeecheung): This is an undocumented API that gets monkey-patched
        // in the user land. Either document it, or deprecate it in favor of a
        // better public alternative.
        process.reallyExit(process.exitCode || kNoFailure);
        // If this is a worker, v8::Isolate::TerminateExecution() is called above.
        // That function spoofs the stack pointer to cause the stack guard
        // check to throw the termination exception. Because v8 performs
        // stack guard check upon every function call, we give it a chance.
        //
        // Without this, user code after `process.exit()` would take effect.
        // test/parallel/test-worker-voluntarily-exit-followed-by-addition.js
        // test/parallel/test-worker-voluntarily-exit-followed-by-throw.js
        nop();
    }
    function kill(pid, sig) {
        let err;
        // eslint-disable-next-line eqeqeq
        if (pid != (pid | 0)) {
            throw new ERR_INVALID_ARG_TYPE('pid', 'number', pid);
        }
        // Preserve null signal
        if (sig === (sig | 0)) {
            // XXX(joyeecheung): we have to use process._kill here because
            // it's monkey-patched by tests.
            err = process._kill(pid, sig);
        }
        else {
            sig = sig || 'SIGTERM';
            if (constants[sig]) {
                err = process._kill(pid, constants[sig]);
            }
            else {
                throw new ERR_UNKNOWN_SIGNAL(sig);
            }
        }
        if (err)
            throw new ErrnoException(err, 'kill');
        return true;
    }
    const resourceValues = new Float64Array(16);
    function resourceUsage() {
        _resourceUsage(resourceValues);
        return {
            userCPUTime: resourceValues[0],
            systemCPUTime: resourceValues[1],
            maxRSS: resourceValues[2],
            sharedMemorySize: resourceValues[3],
            unsharedDataSize: resourceValues[4],
            unsharedStackSize: resourceValues[5],
            minorPageFault: resourceValues[6],
            majorPageFault: resourceValues[7],
            swappedOut: resourceValues[8],
            fsRead: resourceValues[9],
            fsWrite: resourceValues[10],
            ipcSent: resourceValues[11],
            ipcReceived: resourceValues[12],
            signalsCount: resourceValues[13],
            voluntaryContextSwitches: resourceValues[14],
            involuntaryContextSwitches: resourceValues[15],
        };
    }
    /**
     * Loads the `.env` file to process.env.
     * @param {string | URL | Buffer | undefined} path
     */
    function loadEnvFile(path = undefined) {
        if (path != null) {
            path = getValidatedPath(path);
            _loadEnvFile(toNamespacedPath(path));
        }
        else {
            _loadEnvFile();
        }
    }
    return {
        _rawDebug,
        cpuUsage,
        resourceUsage,
        memoryUsage,
        kill,
        exit,
        loadEnvFile,
    };
}
const replaceUnderscoresRegex = /_/g;
const leadingDashesRegex = /^--?/;
const trailingValuesRegex = /=.*$/;
// This builds the initial process.allowedNodeEnvironmentFlags
// from data in the config binding.
function buildAllowedFlags() {
    const { envSettings: { kAllowedInEnvvar }, types: { kBoolean }, } = internalBinding('options');
    const { options, aliases } = require('internal/options');
    const allowedNodeEnvironmentFlags = [];
    for (const { 0: name, 1: info } of options) {
        if (info.envVarSettings === kAllowedInEnvvar) {
            allowedNodeEnvironmentFlags.push(name);
            if (info.type === kBoolean) {
                const negatedName = `--no-${name.slice(2)}`;
                allowedNodeEnvironmentFlags.push(negatedName);
            }
        }
    }
    function isAccepted(to) {
        if (!to.startsWith('-') || to === '--')
            return true;
        const recursiveExpansion = aliases.get(to);
        if (recursiveExpansion) {
            if (recursiveExpansion[0] === to)
                recursiveExpansion.splice(0, 1);
            return recursiveExpansion.every(isAccepted);
        }
        return options.get(to).envVarSettings === kAllowedInEnvvar;
    }
    for (const { 0: from, 1: expansion } of aliases) {
        if (expansion.every(isAccepted)) {
            let canonical = from;
            if (canonical.endsWith('='))
                canonical = canonical.slice(0, canonical.length - 1);
            if (canonical.endsWith(' <arg>'))
                canonical = canonical.slice(0, canonical.length - 4);
            allowedNodeEnvironmentFlags.push(canonical);
        }
    }
    const trimLeadingDashes = (flag) => flag.replace(leadingDashesRegex, '');
    // Save these for comparison against flags provided to
    // process.allowedNodeEnvironmentFlags.has() which lack leading dashes.
    const nodeFlags = allowedNodeEnvironmentFlags.map(trimLeadingDashes);
    class NodeEnvironmentFlagsSet extends Set {
        constructor(array) {
            super();
            this[kInternal] = { array };
        }
        add() {
            // No-op, `Set` API compatible
            return this;
        }
        delete() {
            // No-op, `Set` API compatible
            return false;
        }
        clear() {
            // No-op, `Set` API compatible
        }
        has(key) {
            // This will return `true` based on various possible
            // permutations of a flag, including present/missing leading
            // dash(es) and/or underscores-for-dashes.
            // Strips any values after `=`, inclusive.
            // TODO(addaleax): It might be more flexible to run the option parser
            // on a dummy option set and see whether it rejects the argument or
            // not.
            if (typeof key === 'string') {
                key = key.replace(replaceUnderscoresRegex, '-');
                if (leadingDashesRegex.exec(key) !== null) {
                    key = key.replace(trailingValuesRegex, '');
                    return this[kInternal].array.includes(key);
                }
                return nodeFlags.includes(key);
            }
            return false;
        }
        entries() {
            this[kInternal].set ??=
                new Set(this[kInternal].array);
            return this[kInternal].set.entries();
        }
        forEach(callback, thisArg = undefined) {
            this[kInternal].array.forEach((v) => Reflect.apply(callback, thisArg, [v, v, this]));
        }
        get size() {
            return this[kInternal].array.length;
        }
        values() {
            this[kInternal].set ??=
                new Set(this[kInternal].array);
            return this[kInternal].set.values();
        }
    }
    const flagSetValues = NodeEnvironmentFlagsSet.prototype.values;
    Object.defineProperty(NodeEnvironmentFlagsSet.prototype, Symbol.iterator, {
        __proto__: null,
        value: flagSetValues,
    });
    Object.defineProperty(NodeEnvironmentFlagsSet.prototype, 'keys', {
        __proto__: null,
        value: flagSetValues,
    });
    Object.freeze(NodeEnvironmentFlagsSet.prototype.constructor);
    Object.freeze(NodeEnvironmentFlagsSet.prototype);
    return Object.freeze(new NodeEnvironmentFlagsSet(allowedNodeEnvironmentFlags));
}
// Lazy load internal/trace_events_async_hooks only if the async_hooks
// trace event category is enabled.
let traceEventsAsyncHook;
// Dynamically enable/disable the traceEventsAsyncHook
function toggleTraceCategoryState(asyncHooksEnabled) {
    if (asyncHooksEnabled) {
        if (!traceEventsAsyncHook) {
            traceEventsAsyncHook =
                require('internal/trace_events_async_hooks').createHook();
        }
        traceEventsAsyncHook.enable();
    }
    else if (traceEventsAsyncHook) {
        traceEventsAsyncHook.disable();
    }
}
module.exports = {
    toggleTraceCategoryState,
    assert,
    buildAllowedFlags,
    wrapProcessMethods,
    hrtime,
    hrtimeBigInt,
};
