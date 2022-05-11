'use strict';

const isOperator = require('./isOperator');

module.exports = function castFilterPath(query, schematype, val) {
  const ctx = query;
  const any$conditionals = Object.keys(val).some(isOperator);

  if (!any$conditionals) {
    return schematype.castForQueryWrapper({
      val: val,
      context: ctx
    });
  }

  const ks = Object.keys(val);

  let k = ks.length;

  while (k--) {
    const $cond = ks[k];
    const nested = val[$cond];

    if ($cond === '$not') {
      if (nested && schematype && !schematype.caster) {
        const _keys = Object.keys(nested);
        if (_keys.length && isOperator(_keys[0])) {
          for (const key of Object.keys(nested)) {
            nested[key] = schematype.castForQueryWrapper({
              $conditional: key,
              val: nested[key],
              context: ctx
            });
          }
        } else {
          val[$cond] = schematype.castForQueryWrapper({
            $conditional: $cond,
            val: nested,
            context: ctx
          });
        }
        continue;
      }
    } else {
      val[$cond] = schematype.castForQueryWrapper({
        $conditional: $cond,
        val: nested,
        context: ctx
      });
    }
  }

  return val;
};