'use strict';
const { AsyncResource } = require('async_hooks');
const { relative } = require('path');
const { createWriteStream } = require('fs');
const { pathToFileURL } = require('internal/url');
const { createDeferredPromise } = require('internal/util');
const { getOptionValue } = require('internal/options');
const { green, yellow, red, white, shouldColorize } = require('internal/util/colors');
const { codes: { ERR_INVALID_ARG_VALUE, ERR_TEST_FAILURE, }, kIsNodeError, } = require('internal/errors');
const { compose } = require('stream');
const coverageColors = {
    __proto__: null,
    high: green,
    medium: yellow,
    low: red,
};
const kMultipleCallbackInvocations = 'multipleCallbackInvocations';
const kRegExpPattern = /^\/(.*)\/([a-z]*)$/;
const kPatterns = ['test', 'test/**/*', 'test-*', '*[.-_]test'];
const kDefaultPattern = `**/{${kPatterns.join(',')}}.?(c|m)js`;
function createDeferredCallback() {
    let calledCount = 0;
    const { promise, resolve, reject } = createDeferredPromise();
    const cb = (err) => {
        calledCount++;
        // If the callback is called a second time, let the user know, but
        // don't let them know more than once.
        if (calledCount > 1) {
            if (calledCount === 2) {
                throw new ERR_TEST_FAILURE('callback invoked multiple times', kMultipleCallbackInvocations);
            }
            return;
        }
        if (err) {
            return reject(err);
        }
        resolve();
    };
    return { __proto__: null, promise, cb };
}
function isTestFailureError(err) {
    return err?.code === 'ERR_TEST_FAILURE' && kIsNodeError in err;
}
function convertStringToRegExp(str, name) {
    const match = kRegExpPattern.exec(str);
    const pattern = match?.[1] ?? str;
    const flags = match?.[2] || '';
    try {
        return new RegExp(pattern, flags);
    }
    catch (err) {
        const msg = err?.message;
        throw new ERR_INVALID_ARG_VALUE(name, str, `is an invalid regular expression.${msg ? ` ${msg}` : ''}`);
    }
}
const kBuiltinDestinations = new Map([
    ['stdout', process.stdout],
    ['stderr', process.stderr],
]);
const kBuiltinReporters = new Map([
    ['spec', 'internal/test_runner/reporter/spec'],
    ['dot', 'internal/test_runner/reporter/dot'],
    ['tap', 'internal/test_runner/reporter/tap'],
    ['junit', 'internal/test_runner/reporter/junit'],
    ['lcov', 'internal/test_runner/reporter/lcov'],
]);
const kDefaultReporter = process.stdout.isTTY ? 'spec' : 'tap';
const kDefaultDestination = 'stdout';
function tryBuiltinReporter(name) {
    const builtinPath = kBuiltinReporters.get(name);
    if (builtinPath === undefined) {
        return;
    }
    return require(builtinPath);
}
function shouldColorizeTestFiles(rootTest) {
    // This function assumes only built-in destinations (stdout/stderr) supports coloring
    const { reporters, destinations } = parseCommandLine();
    return reporters.some((_, index) => {
        const destination = kBuiltinDestinations.get(destinations[index]);
        return destination && shouldColorize(destination);
    });
}
async function getReportersMap(reporters, destinations) {
    return Promise.all(reporters.map(async (name, i) => {
        const destination = kBuiltinDestinations.get(destinations[i]) ?? createWriteStream(destinations[i]);
        // Load the test reporter passed to --test-reporter
        let reporter = tryBuiltinReporter(name);
        if (reporter === undefined) {
            let parentURL;
            try {
                parentURL = pathToFileURL(process.cwd() + '/').href;
            }
            catch {
                parentURL = 'file:///';
            }
            const cascadedLoader = require('internal/modules/esm/loader').getOrInitializeCascadedLoader();
            reporter = await cascadedLoader.import(name, parentURL, { __proto__: null });
        }
        if (reporter?.default) {
            reporter = reporter.default;
        }
        if (reporter?.prototype && Object.getOwnPropertyDescriptor(reporter.prototype, 'constructor')) {
            reporter = new reporter();
        }
        if (!reporter) {
            throw new ERR_INVALID_ARG_VALUE('Reporter', name, 'is not a valid reporter');
        }
        return { __proto__: null, reporter, destination };
    }));
}
const reporterScope = new AsyncResource('TestReporterScope');
const setupTestReporters = reporterScope.bind(async (rootReporter) => {
    const { reporters, destinations } = parseCommandLine();
    const reportersMap = await getReportersMap(reporters, destinations);
    for (let i = 0; i < reportersMap.length; i++) {
        const { reporter, destination } = reportersMap[i];
        compose(rootReporter, reporter).pipe(destination);
    }
});
let globalTestOptions;
function parseCommandLine() {
    if (globalTestOptions) {
        return globalTestOptions;
    }
    const isTestRunner = getOptionValue('--test');
    const coverage = getOptionValue('--experimental-test-coverage');
    const forceExit = getOptionValue('--test-force-exit');
    const sourceMaps = getOptionValue('--enable-source-maps');
    const isChildProcess = process.env.NODE_TEST_CONTEXT === 'child';
    const isChildProcessV8 = process.env.NODE_TEST_CONTEXT === 'child-v8';
    let destinations;
    let reporters;
    let testNamePatterns;
    let testOnlyFlag;
    if (isChildProcessV8) {
        kBuiltinReporters.set('v8-serializer', 'internal/test_runner/reporter/v8-serializer');
        reporters = ['v8-serializer'];
        destinations = [kDefaultDestination];
    }
    else if (isChildProcess) {
        reporters = ['tap'];
        destinations = [kDefaultDestination];
    }
    else {
        destinations = getOptionValue('--test-reporter-destination');
        reporters = getOptionValue('--test-reporter');
        if (reporters.length === 0 && destinations.length === 0) {
            reporters.push(kDefaultReporter);
        }
        if (reporters.length === 1 && destinations.length === 0) {
            destinations.push(kDefaultDestination);
        }
        if (destinations.length !== reporters.length) {
            throw new ERR_INVALID_ARG_VALUE('--test-reporter', reporters, 'must match the number of specified \'--test-reporter-destination\'');
        }
    }
    if (isTestRunner) {
        testOnlyFlag = false;
        testNamePatterns = null;
    }
    else {
        const testNamePatternFlag = getOptionValue('--test-name-pattern');
        testOnlyFlag = getOptionValue('--test-only');
        testNamePatterns = testNamePatternFlag?.length > 0 ? testNamePatternFlag.map((re) => convertStringToRegExp(re, '--test-name-pattern')) : null;
    }
    globalTestOptions = {
        __proto__: null,
        isTestRunner,
        coverage,
        forceExit,
        sourceMaps,
        testOnlyFlag,
        testNamePatterns,
        reporters,
        destinations,
    };
    return globalTestOptions;
}
function countCompletedTest(test, harness = test.root.harness) {
    if (test.nesting === 0) {
        harness.counters.topLevel++;
    }
    if (test.reportedType === 'suite') {
        harness.counters.suites++;
        return;
    }
    // Check SKIP and TODO tests first, as those should not be counted as
    // failures.
    if (test.skipped) {
        harness.counters.skipped++;
    }
    else if (test.isTodo) {
        harness.counters.todo++;
    }
    else if (test.cancelled) {
        harness.counters.cancelled++;
    }
    else if (!test.passed) {
        harness.counters.failed++;
    }
    else {
        harness.counters.passed++;
    }
    harness.counters.all++;
}
const memo = new Map();
function addTableLine(prefix, width) {
    const key = `${prefix}-${width}`;
    let value = memo.get(key);
    if (value === undefined) {
        value = `${prefix}${'-'.repeat(width)}\n`;
        memo.set(key, value);
    }
    return value;
}
const kHorizontalEllipsis = '\u2026';
function truncateStart(string, width) {
    return string.length > width ? `${kHorizontalEllipsis}${string.slice(string.length - width + 1)}` : string;
}
function truncateEnd(string, width) {
    return string.length > width ? `${string.slice(0, width - 1)}${kHorizontalEllipsis}` : string;
}
function formatLinesToRanges(values) {
    return values.reduce((prev, current, index, array) => {
        if ((index > 0) && ((current - array[index - 1]) === 1)) {
            prev[prev.length - 1][1] = current;
        }
        else {
            prev.push([current]);
        }
        return prev;
    }, []).map((range) => range.join('-'));
}
function getUncoveredLines(lines) {
    return lines.flatMap((line) => (line.count === 0 ? line.line : []));
}
function formatUncoveredLines(lines, table) {
    if (table)
        return formatLinesToRanges(lines).join(' ');
    return lines.join(', ');
}
const kColumns = ['line %', 'branch %', 'funcs %'];
const kColumnsKeys = ['coveredLinePercent', 'coveredBranchPercent', 'coveredFunctionPercent'];
const kSeparator = ' | ';
function getCoverageReport(pad, summary, symbol, color, table) {
    const prefix = `${pad}${symbol}`;
    let report = `${color}${prefix}start of coverage report\n`;
    let filePadLength;
    let columnPadLengths = [];
    let uncoveredLinesPadLength;
    let tableWidth;
    if (table) {
        // Get expected column sizes
        filePadLength = table && summary.files.reduce((acc, file) => Math.max(acc, relative(summary.workingDirectory, file.path).length), 0);
        filePadLength = Math.max(filePadLength, 'file'.length);
        const fileWidth = filePadLength + 2;
        columnPadLengths = kColumns.map((column) => (table ? Math.max(column.length, 6) : 0));
        const columnsWidth = columnPadLengths.reduce((acc, columnPadLength) => acc + columnPadLength + 3, 0);
        uncoveredLinesPadLength = table && summary.files.reduce((acc, file) => Math.max(acc, formatUncoveredLines(getUncoveredLines(file.lines), table).length), 0);
        uncoveredLinesPadLength = Math.max(uncoveredLinesPadLength, 'uncovered lines'.length);
        const uncoveredLinesWidth = uncoveredLinesPadLength + 2;
        tableWidth = fileWidth + columnsWidth + uncoveredLinesWidth;
        // Fit with sensible defaults
        const availableWidth = (process.stdout.columns || Infinity) - prefix.length;
        const columnsExtras = tableWidth - availableWidth;
        if (table && columnsExtras > 0) {
            // Ensure file name is sufficiently visible
            const minFilePad = Math.min(8, filePadLength);
            filePadLength -= Math.floor(columnsExtras * 0.2);
            filePadLength = Math.max(filePadLength, minFilePad);
            // Get rest of available space, subtracting margins
            uncoveredLinesPadLength = Math.max(availableWidth - columnsWidth - (filePadLength + 2) - 2, 1);
            // Update table width
            tableWidth = availableWidth;
        }
        else {
            uncoveredLinesPadLength = Infinity;
        }
    }
    function getCell(string, width, pad, truncate, coverage) {
        if (!table)
            return string;
        let result = string;
        if (pad)
            result = pad(result, width);
        if (truncate)
            result = truncate(result, width);
        if (color && coverage !== undefined) {
            if (coverage > 90)
                return `${coverageColors.high}${result}${color}`;
            if (coverage > 50)
                return `${coverageColors.medium}${result}${color}`;
            return `${coverageColors.low}${result}${color}`;
        }
        return result;
    }
    // Head
    if (table)
        report += addTableLine(prefix, tableWidth);
    report += `${prefix}${getCell('file', filePadLength, StringPrototypePadEnd, truncateEnd)}${kSeparator}` +
        `${kColumns.map((column, i) => getCell(column, columnPadLengths[i], StringPrototypePadStart)).join(kSeparator)}${kSeparator}` +
        `${getCell('uncovered lines', uncoveredLinesPadLength, false, truncateEnd)}\n`;
    if (table)
        report += addTableLine(prefix, tableWidth);
    // Body
    for (let i = 0; i < summary.files.length; ++i) {
        const file = summary.files[i];
        const relativePath = relative(summary.workingDirectory, file.path);
        let fileCoverage = 0;
        const coverages = kColumnsKeys.map((columnKey) => {
            const percent = file[columnKey];
            fileCoverage += percent;
            return percent;
        });
        fileCoverage /= kColumnsKeys.length;
        report += `${prefix}${getCell(relativePath, filePadLength, StringPrototypePadEnd, truncateStart, fileCoverage)}${kSeparator}` +
            `${coverages.map((coverage, j) => getCell(coverage.toFixed(2), columnPadLengths[j], StringPrototypePadStart, false, coverage)).join(kSeparator)}${kSeparator}` +
            `${getCell(formatUncoveredLines(getUncoveredLines(file.lines), table), uncoveredLinesPadLength, false, truncateEnd)}\n`;
    }
    // Foot
    if (table)
        report += addTableLine(prefix, tableWidth);
    report += `${prefix}${getCell('all files', filePadLength, StringPrototypePadEnd, truncateEnd)}${kSeparator}` +
        `${kColumnsKeys.map((columnKey, j) => getCell(summary.totals[columnKey].toFixed(2), columnPadLengths[j], StringPrototypePadStart, false, summary.totals[columnKey])).join(kSeparator)} |\n`;
    if (table)
        report += addTableLine(prefix, tableWidth);
    report += `${prefix}end of coverage report\n`;
    if (color) {
        report += white;
    }
    return report;
}
module.exports = {
    convertStringToRegExp,
    countCompletedTest,
    createDeferredCallback,
    isTestFailureError,
    kDefaultPattern,
    parseCommandLine,
    reporterScope,
    setupTestReporters,
    shouldColorizeTestFiles,
    getCoverageReport,
};
