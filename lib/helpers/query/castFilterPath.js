'use strict';

module.exports = function castFilterPath(query, schematype, val) {
  const any$conditionals = Object.keys(val).some(function(k) {
    return k.charAt(0) === '$' && k !== '$id' && k !== '$ref';
  });

  if (!any$conditionals) {
    return schematype.castForQueryWrapper({
      val: val,
      context: query
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
        if (_keys.length && _keys[0].charAt(0) === '$') {
          for (const key in nested) {
            nested[key] = schematype.castForQueryWrapper({
              $conditional: key,
              val: nested[key],
              context: context
            });
          }
        } else {
          val[$cond] = schematype.castForQueryWrapper({
            $conditional: $cond,
            val: nested,
            context: context
          });
        }
        continue;
      }
      // cast(schematype.caster ? schematype.caster.schema : schema, nested, options, context);
    } else {
      val[$cond] = schematype.castForQueryWrapper({
        $conditional: $cond,
        val: nested,
        context: context
      });
    }
  }

  return val;
};