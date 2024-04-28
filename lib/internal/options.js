'use strict';

const {
  getCLIOptions,
  getEmbedderOptions: getEmbedderOptionsFromBinding,
} = internalBinding('options');

let warnOnAllowUnauthorized = true;

let optionsMap;
let aliasesMap;
let embedderOptions;

// getCLIOptions() would serialize the option values from C++ land.
// It would error if the values are queried before bootstrap is
// complete so that we don't accidentally include runtime-dependent
// states into a runtime-independent snapshot.
function getCLIOptionsFromBinding() {
  if (!optionsMap) {
    ({ options: optionsMap } = getCLIOptions());
  }
  return optionsMap;
}

function getAliasesFromBinding() {
  if (!aliasesMap) {
    ({ aliases: aliasesMap } = getCLIOptions());
  }
  return aliasesMap;
}

function getEmbedderOptions() {
  if (!embedderOptions) {
    embedderOptions = getEmbedderOptionsFromBinding();
  }
  return embedderOptions;
}

function refreshOptions() {
  optionsMap = undefined;
  aliasesMap = undefined;
}

// --conditions -> 2
// --no-addons -> 2
// --require -> 2
// --experimental-default-type -> 2
// --preserve-symlinks-main -> 2
// --experimental-default-type -> 3
// --inspect-brk -> 2
function getOptionValue(optionName) {
  if (!optionsMap) {
    ({ options: optionsMap } = getCLIOptions());
  }
  if (optionName.startsWith('--no-')) {
    const option = optionsMap.get('--' + optionName.slice(5));
    return option && !option.value;
  }
  return optionsMap.get(optionName)?.value;
}

function getAllowUnauthorized() {
  const allowUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0';

  if (allowUnauthorized && warnOnAllowUnauthorized) {
    warnOnAllowUnauthorized = false;
    process.emitWarning(
      'Setting the NODE_TLS_REJECT_UNAUTHORIZED ' +
      'environment variable to \'0\' makes TLS connections ' +
      'and HTTPS requests insecure by disabling ' +
      'certificate verification.');
  }
  return allowUnauthorized;
}

module.exports = {
  get options() {
    return getCLIOptionsFromBinding();
  },
  get aliases() {
    return getAliasesFromBinding();
  },
  getOptionValue,
  getAllowUnauthorized,
  getEmbedderOptions,
  refreshOptions,
};
