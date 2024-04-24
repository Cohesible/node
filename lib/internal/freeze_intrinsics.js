// Adapted from SES/Caja - Copyright (C) 2011 Google Inc.
// Copyright (C) 2018 Agoric
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// SPDX-License-Identifier: Apache-2.0
// Based upon:
// https://github.com/google/caja/blob/HEAD/src/com/google/caja/ses/startSES.js
// https://github.com/google/caja/blob/HEAD/src/com/google/caja/ses/repairES5.js
// https://github.com/tc39/proposal-ses/blob/e5271cc42a257a05dcae2fd94713ed2f46c08620/shim/src/freeze.js
'use strict';
const { Intl, SharedArrayBuffer, WebAssembly, } = globalThis;
module.exports = function () {
    const { Console } = require('internal/console/constructor');
    const console = require('internal/console/global');
    const { clearImmediate, clearInterval, clearTimeout, setImmediate, setInterval, setTimeout, } = require('timers');
    const intrinsicPrototypes = [
        Object.prototype,
        Function.prototype,
        Boolean.prototype,
        Symbol.prototype,
        Error.prototype,
        AggregateError.prototype,
        EvalError.prototype,
        RangeError.prototype,
        ReferenceError.prototype,
        SyntaxError.prototype,
        TypeError.prototype,
        URIError.prototype,
        Number.prototype,
        BigInt.prototype,
        Date.prototype,
        String.prototype, // 22.1
        StringIteratorPrototype,
        RegExp.prototype, // 22.2
        // 22.2.7 RegExpStringIteratorPrototype
        Object.getPrototypeOf(/e/[Symbol.matchAll]()),
        Array.prototype, // 23.1
        ArrayIteratorPrototype, // 23.1.5
        TypedArrayPrototype,
        Int8Array.prototype,
        Uint8Array.prototype,
        Uint8ClampedArray.prototype,
        Int16Array.prototype,
        Uint16Array.prototype,
        Int32Array.prototype,
        Uint32Array.prototype,
        Float32Array.prototype,
        Float64Array.prototype,
        BigInt64Array.prototype,
        BigUint64Array.prototype,
        Map.prototype, // 24.1
        // 24.1.5 MapIteratorPrototype
        Object.getPrototypeOf(new Map()[Symbol.iterator]()),
        Set.prototype, // 24.2
        // 24.2.5 SetIteratorPrototype
        Object.getPrototypeOf(new Set()[Symbol.iterator]()),
        WeakMap.prototype,
        WeakSet.prototype,
        ArrayBuffer.prototype,
        DataView.prototype,
        WeakRef.prototype,
        FinalizationRegistry.prototype,
        Reflect.getPrototypeOf(Reflect.getPrototypeOf(Array.prototype[Symbol.iterator]())), // 27.1.2 IteratorPrototype
        // 27.1.3 AsyncIteratorPrototype
        Object.getPrototypeOf(Object.getPrototypeOf(Object.getPrototypeOf((async function* () { })()))),
        PromisePrototype, // 27.2
        // Other APIs / Web Compatibility
        Console.prototype,
    ];
    const intrinsics = [
        // 10.2.4.1 ThrowTypeError
        Object.getOwnPropertyDescriptor(Function.prototype, 'caller').get,
        // 19 The Global Object
        // 19.2 Function Properties of the Global Object
        // eslint-disable-next-line node-core/prefer-primordials
        eval,
        // eslint-disable-next-line node-core/prefer-primordials
        isFinite,
        // eslint-disable-next-line node-core/prefer-primordials
        isNaN,
        // eslint-disable-next-line node-core/prefer-primordials
        parseFloat,
        // eslint-disable-next-line node-core/prefer-primordials
        parseInt,
        // 19.2.6 URI Handling Functions
        decodeURI,
        decodeURIComponent,
        encodeURI,
        encodeURIComponent,
        // 20 Fundamental Objects
        Object, // 20.1
        Function, // 20.2
        Boolean, // 20.3
        Symbol, // 20.4
        Error, // 20.5
        AggregateError,
        EvalError,
        RangeError,
        ReferenceError,
        SyntaxError,
        TypeError,
        URIError,
        // 21 Numbers and Dates
        Number, // 21.1
        BigInt, // 21.2
        // eslint-disable-next-line node-core/prefer-primordials
        Math, // 21.3
        Date, // 21.4
        // 22 Text Processing
        String, // 22.1
        StringIteratorPrototype, // 22.1.5
        RegExp, // 22.2
        // 22.2.7 RegExpStringIteratorPrototype
        Object.getPrototypeOf(/e/[Symbol.matchAll]()),
        // 23 Indexed Collections
        Array, // 23.1
        ArrayIteratorPrototype, // 23.1.5
        // 23.2 TypedArray
        TypedArray,
        Int8Array,
        Uint8Array,
        Uint8ClampedArray,
        Int16Array,
        Uint16Array,
        Int32Array,
        Uint32Array,
        Float32Array,
        Float64Array,
        BigInt64Array,
        BigUint64Array,
        // 24 Keyed Collections
        Map, // 24.1
        // 24.1.5 MapIteratorPrototype
        Object.getPrototypeOf(new Map()[Symbol.iterator]()),
        Set, // 24.2
        // 24.2.5 SetIteratorPrototype
        Object.getPrototypeOf(new Set()[Symbol.iterator]()),
        WeakMap, // 24.3
        WeakSet, // 24.4
        // 25 Structured Data
        ArrayBuffer, // 25.1
        DataView, // 25.3
        Atomics, // 25.4
        // eslint-disable-next-line node-core/prefer-primordials
        JSON, // 25.5
        // 26 Managing Memory
        WeakRef, // 26.1
        FinalizationRegistry, // 26.2
        // 27 Control Abstraction Objects
        // 27.1 Iteration
        Object.getPrototypeOf(ArrayIteratorPrototype), // 27.1.2 IteratorPrototype
        // 27.1.3 AsyncIteratorPrototype
        Object.getPrototypeOf(Object.getPrototypeOf(Object.getPrototypeOf((async function* () { })()))),
        Promise, // 27.2
        // 27.3 GeneratorFunction
        Object.getPrototypeOf(function* () { }),
        // 27.4 AsyncGeneratorFunction
        Object.getPrototypeOf(async function* () { }),
        // 27.7 AsyncFunction
        Object.getPrototypeOf(async function () { }),
        // 28 Reflection
        // eslint-disable-next-line node-core/prefer-primordials
        Reflect, // 28.1
        Proxy, // 28.2
        // B.2.1
        escape,
        unescape,
        // Other APIs / Web Compatibility
        clearImmediate,
        clearInterval,
        clearTimeout,
        setImmediate,
        setInterval,
        setTimeout,
        console,
    ];
    if (typeof SharedArrayBuffer !== 'undefined') { // 25.2
        intrinsicPrototypes.push(SharedArrayBuffer.prototype);
        intrinsics.push(SharedArrayBuffer);
    }
    if (typeof WebAssembly !== 'undefined') {
        intrinsicPrototypes.push(WebAssembly.Module.prototype, WebAssembly.Instance.prototype, WebAssembly.Table.prototype, WebAssembly.Memory.prototype, WebAssembly.CompileError.prototype, WebAssembly.LinkError.prototype, WebAssembly.RuntimeError.prototype);
        intrinsics.push(WebAssembly);
    }
    if (typeof Intl !== 'undefined') {
        intrinsicPrototypes.push(Intl.Collator.prototype, Intl.DateTimeFormat.prototype, Intl.ListFormat.prototype, Intl.NumberFormat.prototype, Intl.PluralRules.prototype, Intl.RelativeTimeFormat.prototype);
        intrinsics.push(Intl);
    }
    intrinsicPrototypes.forEach(enableDerivedOverrides);
    const frozenSet = new WeakSet();
    intrinsics.forEach(deepFreeze);
    // 19.1 Value Properties of the Global Object
    Object.defineProperty(globalThis, 'globalThis', {
        __proto__: null,
        configurable: false,
        writable: false,
        value: globalThis,
    });
    // Objects that are deeply frozen.
    function deepFreeze(root) {
        /**
         * "innerDeepFreeze()" acts like "Object.freeze()", except that:
         *
         * To deepFreeze an object is to freeze it and all objects transitively
         * reachable from it via transitive reflective property and prototype
         * traversal.
         */
        function innerDeepFreeze(node) {
            // Objects that we have frozen in this round.
            const freezingSet = new Set();
            // If val is something we should be freezing but aren't yet,
            // add it to freezingSet.
            function enqueue(val) {
                if (Object(val) !== val) {
                    // ignore primitives
                    return;
                }
                const type = typeof val;
                if (type !== 'object' && type !== 'function') {
                    // NB: handle for any new cases in future
                }
                if (frozenSet.has(val) || freezingSet.has(val)) {
                    // TODO: Use uncurried form
                    // Ignore if already frozen or freezing
                    return;
                }
                freezingSet.add(val); // TODO: Use uncurried form
            }
            function doFreeze(obj) {
                // Immediately freeze the object to ensure reactive
                // objects such as proxies won't add properties
                // during traversal, before they get frozen.
                // Object are verified before being enqueued,
                // therefore this is a valid candidate.
                // Throws if this fails (strict mode).
                Object.freeze(obj);
                // We rely upon certain commitments of Object.freeze and proxies here
                // Get stable/immutable outbound links before a Proxy has a chance to do
                // something sneaky.
                const proto = Object.getPrototypeOf(obj);
                const descs = Object.getOwnPropertyDescriptors(obj);
                enqueue(proto);
                Reflect.ownKeys(descs).forEach((name) => {
                    const desc = descs[name];
                    if (Object.hasOwn(desc, 'value')) {
                        // todo uncurried form
                        enqueue(desc.value);
                    }
                    else {
                        enqueue(desc.get);
                        enqueue(desc.set);
                    }
                });
            }
            function dequeue() {
                // New values added before forEach() has finished will be visited.
                freezingSet.forEach(doFreeze); // TODO: Curried forEach
            }
            function commit() {
                // TODO: Curried forEach
                // We capture the real WeakSet.prototype.add above, in case someone
                // changes it. The two-argument form of forEach passes the second
                // argument as the 'this' binding, so we add to the correct set.
                freezingSet.forEach(frozenSet.add, frozenSet);
            }
            enqueue(node);
            dequeue();
            commit();
        }
        innerDeepFreeze(root);
        return root;
    }
    /**
     * For a special set of properties (defined below), it ensures that the
     * effect of freezing does not suppress the ability to override these
     * properties on derived objects by simple assignment.
     *
     * Because of lack of sufficient foresight at the time, ES5 unfortunately
     * specified that a simple assignment to a non-existent property must fail if
     * it would override a non-writable data property of the same name. (In
     * retrospect, this was a mistake, but it is now too late and we must live
     * with the consequences.) As a result, simply freezing an object to make it
     * tamper proof has the unfortunate side effect of breaking previously correct
     * code that is considered to have followed JS best practices, if this
     * previous code used assignment to override.
     *
     * To work around this mistake, deepFreeze(), prior to freezing, replaces
     * selected configurable own data properties with accessor properties which
     * simulate what we should have specified -- that assignments to derived
     * objects succeed if otherwise possible.
     */
    function enableDerivedOverride(obj, prop, desc) {
        if (Object.hasOwn(desc, 'value') && desc.configurable) {
            const value = desc.value;
            function getter() {
                return value;
            }
            // Re-attach the data property on the object so
            // it can be found by the deep-freeze traversal process.
            getter.value = value;
            function setter(newValue) {
                if (obj === this) {
                    // eslint-disable-next-line no-restricted-syntax
                    throw new TypeError(`Cannot assign to read only property '${prop}' of object '${obj}'`);
                }
                if (Object.hasOwn(this, prop)) {
                    this[prop] = newValue;
                }
                else {
                    Object.defineProperty(this, prop, {
                        __proto__: null,
                        value: newValue,
                        writable: true,
                        enumerable: true,
                        configurable: true,
                    });
                }
            }
            Object.defineProperty(obj, prop, {
                __proto__: null,
                get: getter,
                set: setter,
                enumerable: desc.enumerable,
                configurable: desc.configurable,
            });
        }
    }
    function enableDerivedOverrides(obj) {
        if (!obj) {
            return;
        }
        const descs = Object.getOwnPropertyDescriptors(obj);
        if (!descs) {
            return;
        }
        Object.getOwnPropertyNames(obj).forEach((prop) => {
            return enableDerivedOverride(obj, prop, descs[prop]);
        });
        Object.getOwnPropertySymbols(obj).forEach((prop) => {
            return enableDerivedOverride(obj, prop, descs[prop]);
        });
    }
};
