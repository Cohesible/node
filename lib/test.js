'use strict';
const { test, describe, it, before, after, beforeEach, afterEach } = require('internal/test_runner/harness');
const { run } = require('internal/test_runner/runner');
module.exports = test;
Object.assign(module.exports, {
    after,
    afterEach,
    before,
    beforeEach,
    describe,
    it,
    run,
    test,
});
let lazyMock;
Object.defineProperty(module.exports, 'mock', {
    __proto__: null,
    configurable: true,
    enumerable: true,
    get() {
        if (lazyMock === undefined) {
            const { MockTracker } = require('internal/test_runner/mock/mock');
            lazyMock = new MockTracker();
        }
        return lazyMock;
    },
});
