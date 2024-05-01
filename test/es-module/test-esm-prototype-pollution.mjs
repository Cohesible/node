import { mustNotCall, mustCall, skip } from '../common/index.mjs';
skip('FIXME');

Object.defineProperties(Object.prototype, {
  then: {
    set: mustNotCall('set %Object.prototype%.then'),
    get: mustNotCall('get %Object.prototype%.then'),
  },
});

import('data:text/javascript,').then(mustCall());
