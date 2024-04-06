'use strict';
const { codes: { ERR_NO_CRYPTO, ERR_UNKNOWN_SIGNAL, }, isErrorStackTraceLimitWritable, uvErrmapGet, overrideStackTrace, } = require('internal/errors');
const { signals } = internalBinding('constants').os;
const { isArrayBufferDetached: _isArrayBufferDetached, guessHandleType: _guessHandleType, privateSymbols: { arrow_message_private_symbol, decorated_private_symbol, }, sleep: _sleep, } = internalBinding('util');
const { isNativeError, isPromise } = internalBinding('types');
const { getOptionValue } = require('internal/options');
const { encodings } = internalBinding('string_decoder');
const noCrypto = !process.versions.openssl;
const experimentalWarnings = new Set();
const colorRegExp = /\u001b\[\d\d?m/g; // eslint-disable-line no-control-regex
let uvBinding;
function lazyUv() {
    uvBinding ??= internalBinding('uv');
    return uvBinding;
}
function removeColors(str) {
    return str.replace(colorRegExp, '');
}
function isError(e) {
    // An error could be an instance of Error while not being a native error
    // or could be from a different realm and not be instance of Error but still
    // be a native error.
    return isNativeError(e) || e instanceof Error;
}
// Keep a list of deprecation codes that have been warned on so we only warn on
// each one once.
const codesWarned = new Set();
let validateString;
function getDeprecationWarningEmitter(code, msg, deprecated, useEmitSync, shouldEmitWarning = () => true) {
    let warned = false;
    return function () {
        if (!warned && shouldEmitWarning()) {
            warned = true;
            if (code !== undefined) {
                if (!codesWarned.has(code)) {
                    const emitWarning = useEmitSync ?
                        require('internal/process/warning').emitWarningSync :
                        process.emitWarning;
                    emitWarning(msg, 'DeprecationWarning', code, deprecated);
                    codesWarned.add(code);
                }
            }
            else {
                process.emitWarning(msg, 'DeprecationWarning', deprecated);
            }
        }
    };
}
function isPendingDeprecation() {
    return getOptionValue('--pending-deprecation') &&
        !getOptionValue('--no-deprecation');
}
// Internal deprecator for pending --pending-deprecation. This can be invoked
// at snapshot building time as the warning permission is only queried at
// run time.
function pendingDeprecate(fn, msg, code) {
    const emitDeprecationWarning = getDeprecationWarningEmitter(code, msg, deprecated, false, isPendingDeprecation);
    function deprecated(...args) {
        emitDeprecationWarning();
        return Reflect.apply(fn, this, args);
    }
    return deprecated;
}
// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
function deprecate(fn, msg, code, useEmitSync) {
    // Lazy-load to avoid a circular dependency.
    if (validateString === undefined)
        ({ validateString } = require('internal/validators'));
    if (code !== undefined)
        validateString(code, 'code');
    const emitDeprecationWarning = getDeprecationWarningEmitter(code, msg, deprecated, useEmitSync);
    function deprecated(...args) {
        // TODO(joyeecheung): use getOptionValue('--no-deprecation') instead.
        if (!process.noDeprecation) {
            emitDeprecationWarning();
        }
        if (new.target) {
            return Reflect.construct(fn, args, new.target);
        }
        return Reflect.apply(fn, this, args);
    }
    // The wrapper will keep the same prototype as fn to maintain prototype chain
    Object.setPrototypeOf(deprecated, fn);
    if (fn.prototype) {
        // Setting this (rather than using Object.setPrototype, as above) ensures
        // that calling the unwrapped constructor gives an instanceof the wrapped
        // constructor.
        deprecated.prototype = fn.prototype;
    }
    return deprecated;
}
function decorateErrorStack(err) {
    if (!(isError(err) && err.stack) || err[decorated_private_symbol])
        return;
    const arrow = err[arrow_message_private_symbol];
    if (arrow) {
        err.stack = arrow + err.stack;
        err[decorated_private_symbol] = true;
    }
}
function assertCrypto() {
    if (noCrypto)
        throw new ERR_NO_CRYPTO();
}
// Return undefined if there is no match.
// Move the "slow cases" to a separate function to make sure this function gets
// inlined properly. That prioritizes the common case.
function normalizeEncoding(enc) {
    if (enc == null || enc === 'utf8' || enc === 'utf-8')
        return 'utf8';
    return slowCases(enc);
}
function slowCases(enc) {
    switch (enc.length) {
        case 4:
            if (enc === 'UTF8')
                return 'utf8';
            if (enc === 'ucs2' || enc === 'UCS2')
                return 'utf16le';
            enc = enc.toLowerCase();
            if (enc === 'utf8')
                return 'utf8';
            if (enc === 'ucs2')
                return 'utf16le';
            break;
        case 3:
            if (enc === 'hex' || enc === 'HEX' ||
                enc.toLowerCase() === 'hex')
                return 'hex';
            break;
        case 5:
            if (enc === 'ascii')
                return 'ascii';
            if (enc === 'ucs-2')
                return 'utf16le';
            if (enc === 'UTF-8')
                return 'utf8';
            if (enc === 'ASCII')
                return 'ascii';
            if (enc === 'UCS-2')
                return 'utf16le';
            enc = enc.toLowerCase();
            if (enc === 'utf-8')
                return 'utf8';
            if (enc === 'ascii')
                return 'ascii';
            if (enc === 'ucs-2')
                return 'utf16le';
            break;
        case 6:
            if (enc === 'base64')
                return 'base64';
            if (enc === 'latin1' || enc === 'binary')
                return 'latin1';
            if (enc === 'BASE64')
                return 'base64';
            if (enc === 'LATIN1' || enc === 'BINARY')
                return 'latin1';
            enc = enc.toLowerCase();
            if (enc === 'base64')
                return 'base64';
            if (enc === 'latin1' || enc === 'binary')
                return 'latin1';
            break;
        case 7:
            if (enc === 'utf16le' || enc === 'UTF16LE' ||
                enc.toLowerCase() === 'utf16le')
                return 'utf16le';
            break;
        case 8:
            if (enc === 'utf-16le' || enc === 'UTF-16LE' ||
                enc.toLowerCase() === 'utf-16le')
                return 'utf16le';
            break;
        case 9:
            if (enc === 'base64url' || enc === 'BASE64URL' ||
                enc.toLowerCase() === 'base64url')
                return 'base64url';
            break;
        default:
            if (enc === '')
                return 'utf8';
    }
}
function emitExperimentalWarning(feature) {
    if (experimentalWarnings.has(feature))
        return;
    const msg = `${feature} is an experimental feature and might change at any time`;
    experimentalWarnings.add(feature);
    process.emitWarning(msg, 'ExperimentalWarning');
}
function filterDuplicateStrings(items, low) {
    const map = new Map();
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const key = item.toLowerCase();
        if (low) {
            map.set(key, key);
        }
        else {
            map.set(key, item);
        }
    }
    return Array.from(map.values()).sort();
}
function cachedResult(fn) {
    let result;
    return () => {
        if (result === undefined)
            result = fn();
        return result.slice();
    };
}
// Useful for Wrapping an ES6 Class with a constructor Function that
// does not require the new keyword. For instance:
//   class A { constructor(x) {this.x = x;}}
//   const B = createClassWrapper(A);
//   B() instanceof A // true
//   B() instanceof B // true
function createClassWrapper(type) {
    function fn(...args) {
        return Reflect.construct(type, args, new.target || type);
    }
    // Mask the wrapper function name and length values
    Object.defineProperties(fn, {
        name: { __proto__: null, value: type.name },
        length: { __proto__: null, value: type.length },
    });
    Object.setPrototypeOf(fn, type);
    fn.prototype = type.prototype;
    return fn;
}
let signalsToNamesMapping;
function getSignalsToNamesMapping() {
    if (signalsToNamesMapping !== undefined)
        return signalsToNamesMapping;
    signalsToNamesMapping = { __proto__: null };
    for (const key in signals) {
        signalsToNamesMapping[signals[key]] = key;
    }
    return signalsToNamesMapping;
}
function convertToValidSignal(signal) {
    if (typeof signal === 'number' && getSignalsToNamesMapping()[signal])
        return signal;
    if (typeof signal === 'string') {
        const signalName = signals[signal.toUpperCase()];
        if (signalName)
            return signalName;
    }
    throw new ERR_UNKNOWN_SIGNAL(signal);
}
function getConstructorOf(obj) {
    while (obj) {
        const descriptor = Object.getOwnPropertyDescriptor(obj, 'constructor');
        if (descriptor !== undefined &&
            typeof descriptor.value === 'function' &&
            descriptor.value.name !== '') {
            return descriptor.value;
        }
        obj = Object.getPrototypeOf(obj);
    }
    return null;
}
let cachedURL;
let cachedCWD;
/**
 * Get the current working directory while accounting for the possibility that it has been deleted.
 * `process.cwd()` can fail if the parent directory is deleted while the process runs.
 * @returns {URL} The current working directory or the volume root if it cannot be determined.
 */
function getCWDURL() {
    const { sep } = require('path');
    const { pathToFileURL } = require('internal/url');
    let cwd;
    try {
        // The implementation of `process.cwd()` already uses proper cache when it can.
        // It's a relatively cheap call performance-wise for the most common use case.
        cwd = process.cwd();
    }
    catch {
        cachedURL ??= pathToFileURL(sep);
    }
    if (cwd != null && cwd !== cachedCWD) {
        cachedURL = pathToFileURL(cwd + sep);
        cachedCWD = cwd;
    }
    return cachedURL;
}
function getSystemErrorName(err) {
    const entry = uvErrmapGet(err);
    return entry ? entry[0] : `Unknown system error ${err}`;
}
function getSystemErrorMap() {
    return lazyUv().getErrorMap();
}
const kCustomPromisifiedSymbol = Symbol.for('nodejs.util.promisify.custom');
const kCustomPromisifyArgsSymbol = Symbol('customPromisifyArgs');
let validateFunction;
function promisify(original) {
    // Lazy-load to avoid a circular dependency.
    if (validateFunction === undefined)
        ({ validateFunction } = require('internal/validators'));
    validateFunction(original, 'original');
    if (original[kCustomPromisifiedSymbol]) {
        const fn = original[kCustomPromisifiedSymbol];
        validateFunction(fn, 'util.promisify.custom');
        return Object.defineProperty(fn, kCustomPromisifiedSymbol, {
            __proto__: null,
            value: fn, enumerable: false, writable: false, configurable: true,
        });
    }
    // Names to create an object from in case the callback receives multiple
    // arguments, e.g. ['bytesRead', 'buffer'] for fs.read.
    const argumentNames = original[kCustomPromisifyArgsSymbol];
    function fn(...args) {
        return new Promise((resolve, reject) => {
            args.push((err, ...values) => {
                if (err) {
                    return reject(err);
                }
                if (argumentNames !== undefined && values.length > 1) {
                    const obj = {};
                    for (let i = 0; i < argumentNames.length; i++)
                        obj[argumentNames[i]] = values[i];
                    resolve(obj);
                }
                else {
                    resolve(values[0]);
                }
            });
            if (isPromise(Reflect.apply(original, this, args))) {
                process.emitWarning('Calling promisify on a function that returns a Promise is likely a mistake.', 'DeprecationWarning', 'DEP0174');
            }
        });
    }
    Object.setPrototypeOf(fn, Object.getPrototypeOf(original));
    Object.defineProperty(fn, kCustomPromisifiedSymbol, {
        __proto__: null,
        value: fn, enumerable: false, writable: false, configurable: true,
    });
    const descriptors = Object.getOwnPropertyDescriptors(original);
    const propertiesValues = Object.values(descriptors);
    for (let i = 0; i < propertiesValues.length; i++) {
        // We want to use null-prototype objects to not rely on globally mutable
        // %Object.prototype%.
        Object.setPrototypeOf(propertiesValues[i], null);
    }
    return Object.defineProperties(fn, descriptors);
}
promisify.custom = kCustomPromisifiedSymbol;
// The built-in Array#join is slower in v8 6.0
function join(output, separator) {
    let str = '';
    if (output.length !== 0) {
        const lastIndex = output.length - 1;
        for (let i = 0; i < lastIndex; i++) {
            // It is faster not to use a template string here
            str += output[i];
            str += separator;
        }
        str += output[lastIndex];
    }
    return str;
}
// As of V8 6.6, depending on the size of the array, this is anywhere
// between 1.5-10x faster than the two-arg version of Array#splice()
function spliceOne(list, index) {
    for (; index + 1 < list.length; index++)
        list[index] = list[index + 1];
    list.pop();
}
const kNodeModulesRE = /^(.*)[\\/]node_modules[\\/]/;
let getStructuredStack;
function isInsideNodeModules() {
    if (getStructuredStack === undefined) {
        // Lazy-load to avoid a circular dependency.
        const { runInNewContext } = require('vm');
        // Use `runInNewContext()` to get something tamper-proof and
        // side-effect-free. Since this is currently only used for a deprecated API,
        // the perf implications should be okay.
        getStructuredStack = runInNewContext(`(function() {
      try { Error.stackTraceLimit = Infinity; } catch {}
      return function structuredStack() {
        const e = new Error();
        overrideStackTrace.set(e, (err, trace) => trace);
        return e.stack;
      };
    })()`, { overrideStackTrace }, { filename: 'structured-stack' });
    }
    const stack = getStructuredStack();
    // Iterate over all stack frames and look for the first one not coming
    // from inside Node.js itself:
    if (Array.isArray(stack)) {
        for (const frame of stack) {
            const filename = frame.getFileName();
            // If a filename does not start with / or contain \,
            // it's likely from Node.js core.
            if (/^\/|\\/.exec(filename) === null)
                continue;
            return kNodeModulesRE.exec(filename) !== null;
        }
    }
    return false;
}
function once(callback) {
    let called = false;
    return function (...args) {
        if (called)
            return;
        called = true;
        return Reflect.apply(callback, this, args);
    };
}
let validateUint32;
function sleep(msec) {
    // Lazy-load to avoid a circular dependency.
    if (validateUint32 === undefined)
        ({ validateUint32 } = require('internal/validators'));
    validateUint32(msec, 'msec');
    _sleep(msec);
}
function createDeferredPromise() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}
// https://heycam.github.io/webidl/#define-the-operations
function defineOperation(target, name, method) {
    Object.defineProperty(target, name, {
        __proto__: null,
        writable: true,
        enumerable: true,
        configurable: true,
        value: method,
    });
}
// https://heycam.github.io/webidl/#es-interfaces
function exposeInterface(target, name, interfaceObject) {
    Object.defineProperty(target, name, {
        __proto__: null,
        writable: true,
        enumerable: false,
        configurable: true,
        value: interfaceObject,
    });
}
// https://heycam.github.io/webidl/#es-namespaces
function exposeNamespace(target, name, namespaceObject) {
    Object.defineProperty(target, name, {
        __proto__: null,
        writable: true,
        enumerable: false,
        configurable: true,
        value: namespaceObject,
    });
}
function exposeGetterAndSetter(target, name, getter, setter = undefined) {
    Object.defineProperty(target, name, {
        __proto__: null,
        enumerable: false,
        configurable: true,
        get: getter,
        set: setter,
    });
}
function defineLazyProperties(target, id, keys, enumerable = true) {
    const descriptors = { __proto__: null };
    let mod;
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        let lazyLoadedValue;
        function set(value) {
            Object.defineProperty(target, key, {
                __proto__: null,
                writable: true,
                value,
            });
        }
        Object.defineProperty(set, 'name', {
            __proto__: null,
            value: `set ${key}`,
        });
        function get() {
            mod ??= require(id);
            if (lazyLoadedValue === undefined) {
                lazyLoadedValue = mod[key];
                set(lazyLoadedValue);
            }
            return lazyLoadedValue;
        }
        Object.defineProperty(get, 'name', {
            __proto__: null,
            value: `get ${key}`,
        });
        descriptors[key] = {
            __proto__: null,
            configurable: true,
            enumerable,
            get,
            set,
        };
    }
    Object.defineProperties(target, descriptors);
}
function defineReplaceableLazyAttribute(target, id, keys, writable = true, check) {
    let mod;
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        let value;
        let setterCalled = false;
        function get() {
            if (check !== undefined) {
                check.call(this);
            }
            if (setterCalled) {
                return value;
            }
            mod ??= require(id);
            value ??= mod[key];
            return value;
        }
        Object.defineProperty(get, 'name', {
            __proto__: null,
            value: `get ${key}`,
        });
        function set(val) {
            setterCalled = true;
            value = val;
        }
        Object.defineProperty(set, 'name', {
            __proto__: null,
            value: `set ${key}`,
        });
        Object.defineProperty(target, key, {
            __proto__: null,
            enumerable: true,
            configurable: true,
            get,
            set: writable ? set : undefined,
        });
    }
}
function exposeLazyInterfaces(target, id, keys) {
    defineLazyProperties(target, id, keys, false);
}
let _DOMException;
const lazyDOMExceptionClass = () => {
    _DOMException ??= internalBinding('messaging').DOMException;
    return _DOMException;
};
const lazyDOMException = (message, name) => {
    _DOMException ??= internalBinding('messaging').DOMException;
    if (isErrorStackTraceLimitWritable()) {
        const limit = Error.stackTraceLimit;
        Error.stackTraceLimit = 0;
        const ex = new _DOMException(message, name);
        Error.stackTraceLimit = limit;
        Error.captureStackTrace(ex, lazyDOMException);
        return ex;
    }
    return new _DOMException(message, name);
};
const kEnumerableProperty = { __proto__: null };
kEnumerableProperty.enumerable = true;
Object.freeze(kEnumerableProperty);
const kEmptyObject = Object.freeze({ __proto__: null });
function filterOwnProperties(source, keys) {
    const filtered = { __proto__: null };
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            filtered[key] = source[key];
        }
    }
    return filtered;
}
/**
 * Mimics `obj[key] = value` but ignoring potential prototype inheritance.
 * @param {any} obj
 * @param {string} key
 * @param {any} value
 * @returns {any}
 */
function setOwnProperty(obj, key, value) {
    return Object.defineProperty(obj, key, {
        __proto__: null,
        configurable: true,
        enumerable: true,
        value,
        writable: true,
    });
}
let internalGlobal;
function getInternalGlobal() {
    if (internalGlobal == null) {
        // Lazy-load to avoid a circular dependency.
        const { runInNewContext } = require('vm');
        internalGlobal = runInNewContext('this', undefined, { contextName: 'internal' });
    }
    return internalGlobal;
}
function SideEffectFreeRegExpPrototypeExec(regex, string) {
    const { RegExp: RegExpFromAnotherRealm } = getInternalGlobal();
    return RegExpFromAnotherRealm.prototype.exec.call(regex, string);
}
const crossRelmRegexes = new WeakMap();
function getCrossRelmRegex(regex) {
    const cached = crossRelmRegexes.get(regex);
    if (cached)
        return cached;
    let flagString = '';
    if (regex.hasIndices)
        flagString += 'd';
    if (regex.global)
        flagString += 'g';
    if (regex.ignoreCase)
        flagString += 'i';
    if (regex.multiline)
        flagString += 'm';
    if (regex.dotAll)
        flagString += 's';
    if (regex.unicode)
        flagString += 'u';
    if (regex.sticky)
        flagString += 'y';
    const { RegExp: RegExpFromAnotherRealm } = getInternalGlobal();
    const crossRelmRegex = new RegExpFromAnotherRealm(regex.source, flagString);
    crossRelmRegexes.set(regex, crossRelmRegex);
    return crossRelmRegex;
}
function SideEffectFreeRegExpPrototypeSymbolReplace(regex, string, replacement) {
    return getCrossRelmRegex(regex)[Symbol.replace](string, replacement);
}
function SideEffectFreeRegExpPrototypeSymbolSplit(regex, string, limit = undefined) {
    return getCrossRelmRegex(regex)[Symbol.split](string, limit);
}
function isArrayBufferDetached(value) {
    if (value.byteLength === 0) {
        return _isArrayBufferDetached(value);
    }
    return false;
}
/**
 * Helper function to lazy-load an initialize-once value.
 * @template T Return value of initializer
 * @param {()=>T} initializer Initializer of the lazily loaded value.
 * @returns {()=>T}
 */
function getLazy(initializer) {
    let value;
    let initialized = false;
    return function () {
        if (initialized === false) {
            value = initializer();
            initialized = true;
        }
        return value;
    };
}
// Setup user-facing NODE_V8_COVERAGE environment variable that writes
// ScriptCoverage objects to a specified directory.
function setupCoverageHooks(dir) {
    const cwd = require('internal/process/execution').tryGetCwd();
    const { resolve } = require('path');
    const coverageDirectory = resolve(cwd, dir);
    const { sourceMapCacheToObject } = require('internal/source_map/source_map_cache');
    if (process.features.inspector) {
        internalBinding('profiler').setCoverageDirectory(coverageDirectory);
        internalBinding('profiler').setSourceMapCacheGetter(sourceMapCacheToObject);
    }
    else {
        process.emitWarning('The inspector is disabled, ' +
            'coverage could not be collected', 'Warning');
        return '';
    }
    return coverageDirectory;
}
const handleTypes = ['TCP', 'TTY', 'UDP', 'FILE', 'PIPE', 'UNKNOWN'];
function guessHandleType(fd) {
    const type = _guessHandleType(fd);
    return handleTypes[type];
}
class WeakReference {
    #weak = null;
    #strong = null;
    #refCount = 0;
    constructor(object) {
        this.#weak = new WeakRef(object);
    }
    incRef() {
        this.#refCount++;
        if (this.#refCount === 1) {
            const derefed = this.#weak.deref();
            if (derefed !== undefined) {
                this.#strong = derefed;
            }
        }
        return this.#refCount;
    }
    decRef() {
        this.#refCount--;
        if (this.#refCount === 0) {
            this.#strong = null;
        }
        return this.#refCount;
    }
    get() {
        return this.#weak.deref();
    }
}
const encodingsMap = { __proto__: null };
for (let i = 0; i < encodings.length; ++i)
    encodingsMap[encodings[i]] = i;
module.exports = {
    getLazy,
    assertCrypto,
    cachedResult,
    convertToValidSignal,
    createClassWrapper,
    createDeferredPromise,
    decorateErrorStack,
    defineOperation,
    defineLazyProperties,
    defineReplaceableLazyAttribute,
    deprecate,
    emitExperimentalWarning,
    encodingsMap,
    exposeInterface,
    exposeLazyInterfaces,
    exposeNamespace,
    exposeGetterAndSetter,
    filterDuplicateStrings,
    filterOwnProperties,
    getConstructorOf,
    getCWDURL,
    getInternalGlobal,
    getSystemErrorMap,
    getSystemErrorName,
    guessHandleType,
    isArrayBufferDetached,
    isError,
    isInsideNodeModules,
    join,
    lazyDOMException,
    lazyDOMExceptionClass,
    normalizeEncoding,
    once,
    promisify,
    SideEffectFreeRegExpPrototypeExec,
    SideEffectFreeRegExpPrototypeSymbolReplace,
    SideEffectFreeRegExpPrototypeSymbolSplit,
    sleep,
    spliceOne,
    setupCoverageHooks,
    removeColors,
    // Symbol used to customize promisify conversion
    customPromisifyArgs: kCustomPromisifyArgsSymbol,
    // Symbol used to provide a custom inspect function for an object as an
    // alternative to using 'inspect'
    customInspectSymbol: Symbol.for('nodejs.util.inspect.custom'),
    // Used by the buffer module to capture an internal reference to the
    // default isEncoding implementation, just in case userland overrides it.
    kIsEncodingSymbol: Symbol('kIsEncodingSymbol'),
    kVmBreakFirstLineSymbol: Symbol('kVmBreakFirstLineSymbol'),
    kEmptyObject,
    kEnumerableProperty,
    setOwnProperty,
    pendingDeprecate,
    WeakReference,
};
