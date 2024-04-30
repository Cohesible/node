'use strict';
const TypedArray = Object.getPrototypeOf(Uint8Array);
const _TypedArrayGetToStringTag = Object.getOwnPropertyDescriptor(TypedArray.prototype, Symbol.toStringTag).get;
const TypedArrayGetToStringTag = _TypedArrayGetToStringTag.call.bind(_TypedArrayGetToStringTag);
function isTypedArray(value) {
    return TypedArrayGetToStringTag(value) !== undefined;
}
function isUint8Array(value) {
    return TypedArrayGetToStringTag(value) === 'Uint8Array';
}
function isUint8ClampedArray(value) {
    return TypedArrayGetToStringTag(value) === 'Uint8ClampedArray';
}
function isUint16Array(value) {
    return TypedArrayGetToStringTag(value) === 'Uint16Array';
}
function isUint32Array(value) {
    return TypedArrayGetToStringTag(value) === 'Uint32Array';
}
function isInt8Array(value) {
    return TypedArrayGetToStringTag(value) === 'Int8Array';
}
function isInt16Array(value) {
    return TypedArrayGetToStringTag(value) === 'Int16Array';
}
function isInt32Array(value) {
    return TypedArrayGetToStringTag(value) === 'Int32Array';
}
function isFloat32Array(value) {
    return TypedArrayGetToStringTag(value) === 'Float32Array';
}
function isFloat64Array(value) {
    return TypedArrayGetToStringTag(value) === 'Float64Array';
}
function isBigInt64Array(value) {
    return TypedArrayGetToStringTag(value) === 'BigInt64Array';
}
function isBigUint64Array(value) {
    return TypedArrayGetToStringTag(value) === 'BigUint64Array';
}
module.exports = {
    ...internalBinding('types'),
    isArrayBufferView: ArrayBuffer.isView,
    isTypedArray,
    isUint8Array,
    isUint8ClampedArray,
    isUint16Array,
    isUint32Array,
    isInt8Array,
    isInt16Array,
    isInt32Array,
    isFloat32Array,
    isFloat64Array,
    isBigInt64Array,
    isBigUint64Array,
};
let isCryptoKey;
let isKeyObject;
Object.defineProperties(module.exports, {
    isKeyObject: {
        configurable: false,
        enumerable: true,
        value(obj) {
            if (!process.versions.openssl) {
                return false;
            }
            if (!isKeyObject) {
                ({ isKeyObject } = require('internal/crypto/keys'));
            }
            return isKeyObject(obj);
        }
    },
    isCryptoKey: {
        configurable: false,
        enumerable: true,
        value(obj) {
            if (!process.versions.openssl) {
                return false;
            }
            if (!isCryptoKey) {
                ({ isCryptoKey } = require('internal/crypto/keys'));
            }
            return isCryptoKey(obj);
        }
    },
});
