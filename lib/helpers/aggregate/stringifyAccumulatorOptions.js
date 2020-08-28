'use strict';

module.exports = function stringifyAccumulatorOptions(pipeline) {
  if (!Array.isArray(pipeline)) {
    return;
  }

  for (const stage of pipeline) {
    if (stage == null) {
      continue;
    }

    const canHaveAccumulator = stage.$group || stage.$bucket || stage.$bucketAuto;
    if (canHaveAccumulator != null) {
      for (const key of Object.keys(canHaveAccumulator)) {
        handleAccumulator(canHaveAccumulator[key]);
      }
    }

    if (stage.$facet != null) {
      for (const key of Object.keys(stage.$facet)) {
        stringifyAccumulatorOptions(stage.$facet[key]);
      }
    }
  }
};

function handleAccumulator(operator) {
  if (operator == null || operator.$accumulator == null) {
    return;
  }

  for (const key of ['init', 'accumulate', 'merge', 'finalize']) {
    if (typeof operator.$accumulator[key] === 'function') {
      operator.$accumulator[key] = String(operator.$accumulator[key]);
    }
  }
}