'use strict';
const { constants, } = internalBinding('performance');
const { PerformanceEntry } = require('internal/perf/performance_entry');
const { PerformanceResourceTiming } = require('internal/perf/resource_timing');
const { PerformanceObserver, PerformanceObserverEntryList, } = require('internal/perf/observe');
const { PerformanceMark, PerformanceMeasure, } = require('internal/perf/usertiming');
const { Performance, performance, } = require('internal/perf/performance');
const { createHistogram, } = require('internal/histogram');
const monitorEventLoopDelay = require('internal/perf/event_loop_delay');
module.exports = {
    Performance,
    PerformanceEntry,
    PerformanceMark,
    PerformanceMeasure,
    PerformanceObserver,
    PerformanceObserverEntryList,
    PerformanceResourceTiming,
    monitorEventLoopDelay,
    createHistogram,
    performance,
};
Object.defineProperty(module.exports, 'constants', {
    __proto__: null,
    configurable: false,
    enumerable: true,
    value: constants,
});
