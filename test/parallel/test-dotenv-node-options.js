'use strict';

const common = require('../common');
const assert = require('node:assert');
const { describe, it } = require('node:test');

if (process.config.variables.node_without_node_options) {
  common.skip('missing NODE_OPTIONS support');
}

const relativePath = '../fixtures/dotenv/node-options.env';

describe('.env supports NODE_OPTIONS', () => {
  it('TZ environment variable', { skip: !common.hasIntl || process.config.variables.icu_small }, async () => {
    const code = `
      require('assert')(new Date().toString().includes('GMT-1000'))
    `.trim();
    // Some CI environments set TZ. Since an env file doesn't override existing
    // environment variables, we need to delete it and then pass the env object
    // as the environment to spawnPromisified.
    const env = { ...process.env };
    delete env.TZ;
    const child = await common.spawnPromisified(
      process.execPath,
      [ `--env-file=${relativePath}`, '--eval', code ],
      { cwd: __dirname, env },
    );
    assert.strictEqual(child.stderr, '');
    assert.strictEqual(child.code, 0);
  });

});
