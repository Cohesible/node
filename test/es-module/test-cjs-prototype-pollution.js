'use strict';

const { mustNotCall, mustCall, skip } = require('../common');
skip('FIXME');
Object.defineProperties(Object.prototype, {
  then: {
    set: mustNotCall('set %Object.prototype%.then'),
    get: mustNotCall('get %Object.prototype%.then'),
  },
});

import('data:text/javascript,').then(mustCall());
