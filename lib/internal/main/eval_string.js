'use strict';
const { prepareMainThreadExecution, markBootstrapComplete, } = require('internal/process/pre_execution');
const { evalModuleEntryPoint, evalScript } = require('internal/process/execution');
const { addBuiltinLibsToObject } = require('internal/modules/helpers');
const { getOptionValue } = require('internal/options');
prepareMainThreadExecution();
addBuiltinLibsToObject(globalThis, '<eval>');
markBootstrapComplete();
const source = getOptionValue('--eval');
const print = getOptionValue('--print');
const shouldLoadESM = getOptionValue('--import').length > 0 || getOptionValue('--experimental-loader').length > 0;
if (getOptionValue('--input-type') === 'module' ||
    (getOptionValue('--experimental-default-type') === 'module' && getOptionValue('--input-type') !== 'commonjs')) {
    evalModuleEntryPoint(source, print);
}
else {
    // For backward compatibility, we want the identifier crypto to be the
    // `node:crypto` module rather than WebCrypto.
    const isUsingCryptoIdentifier = getOptionValue('--experimental-global-webcrypto') &&
        /\bcrypto\b/.exec(source) !== null;
    const shouldDefineCrypto = isUsingCryptoIdentifier && internalBinding('config').hasOpenSSL;
    if (isUsingCryptoIdentifier && !shouldDefineCrypto) {
        // This is taken from `addBuiltinLibsToObject`.
        const object = globalThis;
        const name = 'crypto';
        const setReal = (val) => {
            // Deleting the property before re-assigning it disables the
            // getter/setter mechanism.
            delete object[name];
            object[name] = val;
        };
        Object.defineProperty(object, name, { __proto__: null, set: setReal });
    }
    evalScript('[eval]', shouldDefineCrypto ? (print ? `let crypto=require("node:crypto");{${source}}` : `(crypto=>{{${source}}})(require('node:crypto'))`) : source, getOptionValue('--inspect-brk'), print, shouldLoadESM);
}
