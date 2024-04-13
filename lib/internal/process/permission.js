'use strict';
const permission = internalBinding('permission');
const { validateString } = require('internal/validators');
const { resolve } = require('path');
let experimentalPermission;
module.exports = Object.freeze({
    __proto__: null,
    isEnabled() {
        if (experimentalPermission === undefined) {
            const { getOptionValue } = require('internal/options');
            experimentalPermission = getOptionValue('--experimental-permission');
        }
        return experimentalPermission;
    },
    has(scope, reference) {
        validateString(scope, 'scope');
        if (reference != null) {
            // TODO: add support for WHATWG URLs and Uint8Arrays.
            validateString(reference, 'reference');
            if (scope.startsWith('fs')) {
                reference = resolve(reference);
            }
        }
        return permission.has(scope, reference);
    },
});
