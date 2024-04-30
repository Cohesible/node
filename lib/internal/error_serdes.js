'use strict';
const CreateNullProtoObject = Object.create.bind(Object.create, null);
const Buffer = require('buffer').Buffer;
const { inspect: { custom: customInspectSymbol } } = require('util');
const kSerializedError = 0;
const kSerializedObject = 1;
const kInspectedError = 2;
const kInspectedSymbol = 3;
const kCustomInspectedObject = 4;
const kSymbolStringLength = 'Symbol('.length;
const errors = {
    Error, TypeError, RangeError, URIError, SyntaxError, ReferenceError, EvalError,
};
const errorConstructorNames = new Set(Object.keys(errors));
function TryGetAllProperties(object, target = object) {
    const all = CreateNullProtoObject();
    if (object === null)
        return all;
    Object.assign(all, TryGetAllProperties(Object.getPrototypeOf(object), target));
    const keys = Object.getOwnPropertyNames(object);
    keys.forEach((key) => {
        let descriptor;
        try {
            // TODO: create a null-prototype descriptor with needed properties only
            descriptor = Object.getOwnPropertyDescriptor(object, key);
        }
        catch {
            return;
        }
        const getter = descriptor.get;
        if (getter && key !== '__proto__') {
            try {
                descriptor.value = getter.call(target);
                delete descriptor.get;
                delete descriptor.set;
            }
            catch {
                // Continue regardless of error.
            }
        }
        if (key === 'cause') {
            descriptor.value = serializeError(descriptor.value);
            all[key] = descriptor;
        }
        else if ('value' in descriptor &&
            typeof descriptor.value !== 'function' && typeof descriptor.value !== 'symbol') {
            all[key] = descriptor;
        }
    });
    return all;
}
function GetConstructors(object) {
    const constructors = [];
    for (let current = object; current !== null; current = Object.getPrototypeOf(current)) {
        const desc = Object.getOwnPropertyDescriptor(current, 'constructor');
        if (desc && desc.value) {
            Object.defineProperty(constructors, constructors.length, {
                value: desc.value, enumerable: true
            });
        }
    }
    return constructors;
}
function GetName(object) {
    const desc = Object.getOwnPropertyDescriptor(object, 'name');
    return desc && desc.value;
}
let internalUtilInspect;
function inspect(...args) {
    if (!internalUtilInspect) {
        internalUtilInspect = require('internal/util/inspect');
    }
    return internalUtilInspect.inspect(...args);
}
const ObjectPrototypeToString = Object.prototype.toString.call.bind(Object.prototype.toString);
let serialize;
function serializeError(error) {
    if (!serialize)
        serialize = require('v8').serialize;
    if (typeof error === 'symbol') {
        return Buffer.from(String.fromCharCode(kInspectedSymbol) + inspect(error), 'utf8');
    }
    try {
        if (typeof error === 'object' && ObjectPrototypeToString(error) === '[object Error]') {
            const constructors = GetConstructors(error);
            for (let i = 0; i < constructors.length; i++) {
                const name = GetName(constructors[i]);
                if (errorConstructorNames.has(name)) {
                    const serialized = serialize({
                        constructor: name,
                        properties: TryGetAllProperties(error),
                    });
                    return Buffer.concat([Buffer.from([kSerializedError]), serialized]);
                }
            }
        }
    }
    catch {
        // Continue regardless of error.
    }
    try {
        if (error != null && customInspectSymbol in error) {
            return Buffer.from(String.fromCharCode(kCustomInspectedObject) + inspect(error), 'utf8');
        }
    }
    catch {
        // Continue regardless of error.
    }
    try {
        const serialized = serialize(error);
        return Buffer.concat([Buffer.from([kSerializedObject]), serialized]);
    }
    catch {
        // Continue regardless of error.
    }
    return Buffer.from(String.fromCharCode(kInspectedError) + inspect(error), 'utf8');
}
function fromBuffer(error) {
    return Buffer.from(error.buffer, error.byteOffset + 1, error.byteLength - 1);
}
let deserialize;
function deserializeError(error) {
    if (!deserialize)
        deserialize = require('v8').deserialize;
    switch (error[0]) {
        case kSerializedError: {
            const { constructor, properties } = deserialize(error.subarray(1));
            const ctor = errors[constructor];
            Object.defineProperty(properties, Symbol.toStringTag, {
                value: { __proto__: null, value: 'Error', configurable: true },
                enumerable: true
            });
            if ('cause' in properties && 'value' in properties.cause) {
                properties.cause.value = deserializeError(properties.cause.value);
            }
            return Object.create(ctor.prototype, properties);
        }
        case kSerializedObject:
            return deserialize(error.subarray(1));
        case kInspectedError:
            return fromBuffer(error).toString('utf8');
        case kInspectedSymbol: {
            const buf = fromBuffer(error);
            return Symbol.for(buf.toString('utf8').substring(kSymbolStringLength, buf.length - 1));
        }
        case kCustomInspectedObject:
            return {
                [customInspectSymbol]: () => fromBuffer(error).toString('utf8')
            };
    }
    require('assert').fail('This should not happen');
}
module.exports = { serializeError, deserializeError };
