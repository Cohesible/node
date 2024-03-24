'use strict';

// User passed `-e` or `--eval` arguments to Node without `-i` or
// `--interactive`.

const {
  ObjectDefineProperty,
  RegExpPrototypeExec,
  globalThis,
} = primordials;

const {
  prepareMainThreadExecution,
  markBootstrapComplete,
} = require('internal/process/pre_execution');
const { evalModule, evalScript } = require('internal/process/execution');
const { addBuiltinLibsToObject } = require('internal/modules/helpers');

const { getOptionValue } = require('internal/options');

// These three lines take ~1.7ms
prepareMainThreadExecution();
addBuiltinLibsToObject(globalThis, '<eval>');
markBootstrapComplete();

// 2ms from the top of the script

const source = getOptionValue('--eval');
const print = getOptionValue('--print');
const loadESM = getOptionValue('--import').length > 0 || getOptionValue('--experimental-loader').length > 0;
if (getOptionValue('--input-type') === 'module' ||
  (getOptionValue('--experimental-default-type') === 'module' && getOptionValue('--input-type') !== 'commonjs')) {
  evalModule(source, print);
} else {
  // For backward compatibility, we want the identifier crypto to be the
  // `node:crypto` module rather than WebCrypto.
  const isUsingCryptoIdentifier =
                             getOptionValue('--experimental-global-webcrypto') &&
                             RegExpPrototypeExec(/\bcrypto\b/, source) !== null;
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
    ObjectDefineProperty(object, name, { __proto__: null, set: setReal });
  }

  // Takes ~7ms
  evalScript('[eval]',
             shouldDefineCrypto ? (
               print ? `let crypto=require("node:crypto");{${source}}` : `(crypto=>{{${source}}})(require('node:crypto'))`
             ) : source,
             getOptionValue('--inspect-brk'),
             print,
             loadESM);
}
