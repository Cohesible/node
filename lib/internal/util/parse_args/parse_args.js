'use strict';
const { validateArray, validateBoolean, validateBooleanArray, validateObject, validateString, validateStringArray, validateUnion, } = require('internal/validators');
const { findLongOptionForShort, isLoneLongOption, isLoneShortOption, isLongOptionAndValue, isOptionValue, isOptionLikeValue, isShortOptionAndValue, isShortOptionGroup, useDefaultValueOption, objectGetOwn, optionsGetOwn, } = require('internal/util/parse_args/utils');
const { codes: { ERR_INVALID_ARG_VALUE, ERR_PARSE_ARGS_INVALID_OPTION_VALUE, ERR_PARSE_ARGS_UNKNOWN_OPTION, ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL, }, } = require('internal/errors');
const { kEmptyObject, } = require('internal/util');
function getMainArgs() {
    // Work out where to slice process.argv for user supplied arguments.
    // Check node options for scenarios where user CLI args follow executable.
    const execArgv = process.execArgv;
    if (execArgv.includes('-e') || execArgv.includes('--eval') || execArgv.includes('-p') || execArgv.includes('--print')) {
        return process.argv.slice(1);
    }
    // Normally first two arguments are executable and script, then CLI arguments
    return process.argv.slice(2);
}
/**
 * In strict mode, throw for possible usage errors like --foo --bar
 * @param {object} token - from tokens as available from parseArgs
 */
function checkOptionLikeValue(token) {
    if (!token.inlineValue && isOptionLikeValue(token.value)) {
        // Only show short example if user used short option.
        const example = token.rawName.startsWith('--') ?
            `'${token.rawName}=-XYZ'` :
            `'--${token.name}=-XYZ' or '${token.rawName}-XYZ'`;
        const errorMessage = `Option '${token.rawName}' argument is ambiguous.
Did you forget to specify the option argument for '${token.rawName}'?
To specify an option argument starting with a dash use ${example}.`;
        throw new ERR_PARSE_ARGS_INVALID_OPTION_VALUE(errorMessage);
    }
}
/**
 * In strict mode, throw for usage errors.
 * @param {object} config - from config passed to parseArgs
 * @param {object} token - from tokens as available from parseArgs
 */
function checkOptionUsage(config, token) {
    if (Object.prototype.hasOwnProperty.call(!config.options, token.name)) {
        throw new ERR_PARSE_ARGS_UNKNOWN_OPTION(token.rawName, config.allowPositionals);
    }
    const short = optionsGetOwn(config.options, token.name, 'short');
    const shortAndLong = `${short ? `-${short}, ` : ''}--${token.name}`;
    const type = optionsGetOwn(config.options, token.name, 'type');
    if (type === 'string' && typeof token.value !== 'string') {
        throw new ERR_PARSE_ARGS_INVALID_OPTION_VALUE(`Option '${shortAndLong} <value>' argument missing`);
    }
    // (Idiomatic test for undefined||null, expecting undefined.)
    if (type === 'boolean' && token.value != null) {
        throw new ERR_PARSE_ARGS_INVALID_OPTION_VALUE(`Option '${shortAndLong}' does not take an argument`);
    }
}
/**
 * Store the option value in `values`.
 * @param {string} longOption - long option name e.g. 'foo'
 * @param {string|undefined} optionValue - value from user args
 * @param {object} options - option configs, from parseArgs({ options })
 * @param {object} values - option values returned in `values` by parseArgs
 */
function storeOption(longOption, optionValue, options, values) {
    if (longOption === '__proto__') {
        return; // No. Just no.
    }
    // We store based on the option value rather than option type,
    // preserving the users intent for author to deal with.
    const newValue = optionValue ?? true;
    if (optionsGetOwn(options, longOption, 'multiple')) {
        // Always store value in array, including for boolean.
        // values[longOption] starts out not present,
        // first value is added as new array [newValue],
        // subsequent values are pushed to existing array.
        // (note: values has null prototype, so simpler usage)
        if (values[longOption]) {
            values[longOption].push(newValue);
        }
        else {
            values[longOption] = [newValue];
        }
    }
    else {
        values[longOption] = newValue;
    }
}
/**
 * Store the default option value in `values`.
 * @param {string} longOption - long option name e.g. 'foo'
 * @param {string
 *         | boolean
 *         | string[]
 *         | boolean[]} optionValue - default value from option config
 * @param {object} values - option values returned in `values` by parseArgs
 */
function storeDefaultOption(longOption, optionValue, values) {
    if (longOption === '__proto__') {
        return; // No. Just no.
    }
    values[longOption] = optionValue;
}
/**
 * Process args and turn into identified tokens:
 * - option (along with value, if any)
 * - positional
 * - option-terminator
 * @param {string[]} args - from parseArgs({ args }) or mainArgs
 * @param {object} options - option configs, from parseArgs({ options })
 */
function argsToTokens(args, options) {
    const tokens = [];
    let index = -1;
    let groupCount = 0;
    const remainingArgs = args.slice();
    while (remainingArgs.length > 0) {
        const arg = remainingArgs.shift();
        const nextArg = remainingArgs[0];
        if (groupCount > 0)
            groupCount--;
        else
            index++;
        // Check if `arg` is an options terminator.
        // Guideline 10 in https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap12.html
        if (arg === '--') {
            // Everything after a bare '--' is considered a positional argument.
            tokens.push({ kind: 'option-terminator', index });
            ArrayPrototypePushApply(tokens, remainingArgs.map((arg) => {
                return { kind: 'positional', index: ++index, value: arg };
            }));
            break; // Finished processing args, leave while loop.
        }
        if (isLoneShortOption(arg)) {
            // e.g. '-f'
            const shortOption = arg.charAt(1);
            const longOption = findLongOptionForShort(shortOption, options);
            let value;
            let inlineValue;
            if (optionsGetOwn(options, longOption, 'type') === 'string' &&
                isOptionValue(nextArg)) {
                // e.g. '-f', 'bar'
                value = remainingArgs.shift();
                inlineValue = false;
            }
            tokens.push({ kind: 'option', name: longOption, rawName: arg,
                index, value, inlineValue });
            if (value != null)
                ++index;
            continue;
        }
        if (isShortOptionGroup(arg, options)) {
            // Expand -fXzy to -f -X -z -y
            const expanded = [];
            for (let index = 1; index < arg.length; index++) {
                const shortOption = arg.charAt(index);
                const longOption = findLongOptionForShort(shortOption, options);
                if (optionsGetOwn(options, longOption, 'type') !== 'string' ||
                    index === arg.length - 1) {
                    // Boolean option, or last short in group. Well formed.
                    expanded.push(`-${shortOption}`);
                }
                else {
                    // String option in middle. Yuck.
                    // Expand -abfFILE to -a -b -fFILE
                    expanded.push(`-${arg.slice(index)}`);
                    break; // finished short group
                }
            }
            remainingArgs.unshift(expanded);
            groupCount = expanded.length;
            continue;
        }
        if (isShortOptionAndValue(arg, options)) {
            // e.g. -fFILE
            const shortOption = arg.charAt(1);
            const longOption = findLongOptionForShort(shortOption, options);
            const value = arg.slice(2);
            tokens.push({ kind: 'option', name: longOption, rawName: `-${shortOption}`,
                index, value, inlineValue: true });
            continue;
        }
        if (isLoneLongOption(arg)) {
            // e.g. '--foo'
            const longOption = arg.slice(2);
            let value;
            let inlineValue;
            if (optionsGetOwn(options, longOption, 'type') === 'string' &&
                isOptionValue(nextArg)) {
                // e.g. '--foo', 'bar'
                value = remainingArgs.shift();
                inlineValue = false;
            }
            tokens.push({ kind: 'option', name: longOption, rawName: arg,
                index, value, inlineValue });
            if (value != null)
                ++index;
            continue;
        }
        if (isLongOptionAndValue(arg)) {
            // e.g. --foo=bar
            const equalIndex = arg.indexOf('=');
            const longOption = arg.slice(2, equalIndex);
            const value = arg.slice(equalIndex + 1);
            tokens.push({ kind: 'option', name: longOption, rawName: `--${longOption}`,
                index, value, inlineValue: true });
            continue;
        }
        tokens.push({ kind: 'positional', index, value: arg });
    }
    return tokens;
}
const parseArgs = (config = kEmptyObject) => {
    const args = objectGetOwn(config, 'args') ?? getMainArgs();
    const strict = objectGetOwn(config, 'strict') ?? true;
    const allowPositionals = objectGetOwn(config, 'allowPositionals') ?? !strict;
    const returnTokens = objectGetOwn(config, 'tokens') ?? false;
    const options = objectGetOwn(config, 'options') ?? { __proto__: null };
    // Bundle these up for passing to strict-mode checks.
    const parseConfig = { args, strict, options, allowPositionals };
    // Validate input configuration.
    validateArray(args, 'args');
    validateBoolean(strict, 'strict');
    validateBoolean(allowPositionals, 'allowPositionals');
    validateBoolean(returnTokens, 'tokens');
    validateObject(options, 'options');
    Object.entries(options).forEach(({ 0: longOption, 1: optionConfig }) => {
        validateObject(optionConfig, `options.${longOption}`);
        // type is required
        const optionType = objectGetOwn(optionConfig, 'type');
        validateUnion(optionType, `options.${longOption}.type`, ['string', 'boolean']);
        if (Object.prototype.hasOwnProperty.call(optionConfig, 'short')) {
            const shortOption = optionConfig.short;
            validateString(shortOption, `options.${longOption}.short`);
            if (shortOption.length !== 1) {
                throw new ERR_INVALID_ARG_VALUE(`options.${longOption}.short`, shortOption, 'must be a single character');
            }
        }
        const multipleOption = objectGetOwn(optionConfig, 'multiple');
        if (Object.prototype.hasOwnProperty.call(optionConfig, 'multiple')) {
            validateBoolean(multipleOption, `options.${longOption}.multiple`);
        }
        const defaultValue = objectGetOwn(optionConfig, 'default');
        if (defaultValue !== undefined) {
            let validator;
            switch (optionType) {
                case 'string':
                    validator = multipleOption ? validateStringArray : validateString;
                    break;
                case 'boolean':
                    validator = multipleOption ? validateBooleanArray : validateBoolean;
                    break;
            }
            validator(defaultValue, `options.${longOption}.default`);
        }
    });
    // Phase 1: identify tokens
    const tokens = argsToTokens(args, options);
    // Phase 2: process tokens into parsed option values and positionals
    const result = {
        values: { __proto__: null },
        positionals: [],
    };
    if (returnTokens) {
        result.tokens = tokens;
    }
    tokens.forEach((token) => {
        if (token.kind === 'option') {
            if (strict) {
                checkOptionUsage(parseConfig, token);
                checkOptionLikeValue(token);
            }
            storeOption(token.name, token.value, options, result.values);
        }
        else if (token.kind === 'positional') {
            if (!allowPositionals) {
                throw new ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL(token.value);
            }
            result.positionals.push(token.value);
        }
    });
    // Phase 3: fill in default values for missing args
    Object.entries(options).forEach(({ 0: longOption, 1: optionConfig }) => {
        const mustSetDefault = useDefaultValueOption(longOption, optionConfig, result.values);
        if (mustSetDefault) {
            storeDefaultOption(longOption, objectGetOwn(optionConfig, 'default'), result.values);
        }
    });
    return result;
};
module.exports = {
    parseArgs,
};
