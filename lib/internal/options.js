'use strict';

const { getOptions, shouldNotRegisterESMLoader } = internalBinding('options');

let optionsMap;
let aliasesMap;

// getOptions() would serialize the option values from C++ land.
// It would error if the values are queried before bootstrap is
// complete so that we don't accidentally include runtime-dependent
// states into a runtime-independent snapshot.
function getOptionsFromBinding() {
  if (!optionsMap) {
    ({ options: optionsMap } = getOptions());
  }
  return optionsMap;
}

function getAliasesFromBinding() {
  if (!aliasesMap) {
    ({ aliases: aliasesMap } = getOptions());
  }
  return aliasesMap;
}

function getOptionValue(optionName) {
  const options = getOptionsFromBinding();
  if (optionName.startsWith('--no-')) {
    const option = options.get('--' + optionName.slice(5));
    return option && !option.value;
  }
  return options.get(optionName)?.value;
}

function getAllowUnauthorized() {
  return true;
}

module.exports = {
  get options() {
    return getOptionsFromBinding();
  },
  get aliases() {
    return getAliasesFromBinding();
  },
  getOptionValue,
  getAllowUnauthorized,
  shouldNotRegisterESMLoader
};
