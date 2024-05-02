'use strict';
const { skip } = require('../common');
skip('FIXME');
// This is a sibling test to test/addons/register-signal-handler/

process.env.ALLOW_CRASHES = true;
require('../addons/register-signal-handler/test');
