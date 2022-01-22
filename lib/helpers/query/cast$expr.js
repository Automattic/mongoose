'use strict';

const CastError = require('../../error/cast');
const StrictModeError = require('../../error/strict');
const castNumber = require('../../cast/number');

const booleanComparison = new Set(['$and', '$or', '$not']);
const comparisonOperator = new Set(['$cmp', '$eq', '$lt', '$lte', '$gt', '$gte']);
const arithmeticOperatorArray = new Set([
  '$multiply',
  '$divide',
  '$log',
  '$mod',
  '$trunc',
  '$avg',
  '$max',
  '$min',
  '$stdDevPop',
  '$stdDevSamp',
  '$sum'
]);
const arithmeticOperatorNumber = new Set([
  '$abs',
  '$exp',
  '$ceil',
  '$floor',
  '$ln',
  '$log10',
  '$round',
  '$sqrt',
  '$sin',
  '$cos',
  '$tan',
  '$asin',
  '$acos',
  '$atan',
  '$atan2',
  '$asinh',
  '$acosh',
  '$atanh',
  '$sinh',
  '$cosh',
  '$tanh',
  '$degreesToRadians',
  '$radiansToDegrees'
]);

module.exports = function cast$expr(val, schema, strictQuery) {
  if (typeof val !== 'object' || val == null) {
    throw new Error('`$expr` must be an object');
  }

  return _castExpression(val, schema, strictQuery);
};

function _castExpression(val, schema, strictQuery) {
  if (isPath(val)) {
    // Assume path
    return val;
  }

  if (val.$cond != null) {
    val.$cond.if = _castExpression(val.$cond.if, schema, strictQuery);
    val.$cond.then = _castExpression(val.$cond.then, schema, strictQuery);
    val.$cond.else = _castExpression(val.$cond.else, schema, strictQuery);
  } else if (val.$ifNull != null) {
    val.$ifNull.map(v => _castExpression(v, schema, strictQuery));
  } else if (val.$switch != null) {
    val.branches.map(v => _castExpression(v, schema, strictQuery));
    val.default = _castExpression(val.default, schema, strictQuery);
  }

  const keys = Object.keys(val);
  for (const key of keys) {
    if (booleanComparison.has(key)) {
      val[key] = val[key].map(v => _castExpression(v, schema, strictQuery));
    } else if (comparisonOperator.has(key)) {
      val[key] = castComparison(val[key], schema, strictQuery);
    } else if (arithmeticOperatorArray.has(key)) {
      val[key] = castArithmetic(val[key], schema, strictQuery);
    } else if (arithmeticOperatorNumber.has(key)) {
      val[key] = castArithmeticSingle(val[key], schema, strictQuery);
    }
  }

  _omitUndefined(val);

  return val;
}

function _omitUndefined(val) {
  const keys = Object.keys(val);
  for (const key of keys) {
    if (val[key] === void 0) {
      delete val[key];
    }
  }
}

// { $op: <number> }
function castArithmeticSingle(val) {
  if (!isLiteral(val)) {
    return val;
  }

  try {
    return castNumber(val);
  } catch (err) {
    throw new CastError('Number', val);
  }
}

// { $op: [<number>, <number>] }
function castArithmetic(val) {
  if (!Array.isArray(val)) {
    if (!isLiteral(val)) {
      return val;
    }
    try {
      return castNumber(val);
    } catch (err) {
      throw new CastError('Number', val);
    }
  }

  return val.map(v => {
    if (!isLiteral(v)) {
      return v;
    }
    try {
      return castNumber(v);
    } catch (err) {
      throw new CastError('Number', v);
    }
  });
}

// { $op: [expression, expression] }
function castComparison(val, schema, strictQuery) {
  if (!Array.isArray(val) || val.length !== 2) {
    throw new Error('Comparison operator must be an array of length 2');
  }

  val[0] = _castExpression(val[0], schema, strictQuery);
  const lhs = val[0];

  if (isLiteral(val[1])) {
    let path = null;
    let schematype = null;
    let caster = null;
    if (isPath(lhs)) {
      path = lhs.slice(1);
      schematype = schema.path(path);
    } else if (typeof lhs === 'object' && lhs != null) {
      if (isPath(lhs.$year)) {
        path = lhs.$year.slice(1) + '.$year';
        caster = castNumber;
      } else if (isPath(lhs.$month)) {
        path = lhs.$month.slice(1) + '.$month';
        caster = castNumber;
      } else if (isPath(lhs.$week)) {
        path = lhs.$week.slice(1) + '.$week';
        caster = castNumber;
      } else if (isPath(lhs.$dayOfMonth)) {
        path = lhs.$dayOfMonth.slice(1) + '.$dayOfMonth';
        caster = castNumber;
      } else if (isPath(lhs.$dayOfYear)) {
        path = lhs.$dayOfMonth.slice(1) + '.$dayOfYear';
        caster = castNumber;
      } else if (isPath(lhs.$hour)) {
        path = lhs.$hour.slice(1) + '.$hour';
        caster = castNumber;
      } else if (isPath(lhs.$minute)) {
        path = lhs.$minute.slice(1) + '.$minute';
        caster = castNumber;
      } else if (isPath(lhs.$second)) {
        path = lhs.$second.slice(1) + '.$second';
        caster = castNumber;
      }
    }

    const is$literal = typeof val[1] === 'object' && val[1] != null && val[1].$literal != null;
    if (schematype != null) {
      if (is$literal) {
        val[1] = { $literal: schematype.cast(val[1].$literal) };
      } else {
        val[1] = schematype.cast(val[1]);
      }
    } else if (caster != null) {
      if (is$literal) {
        try {
          val[1] = { $literal: caster(val[1].$literal) };
        } catch (err) {
          throw new CastError(caster.name.slice(4 /* 'cast'.length */), val[1], path + '.$literal');
        }
      } else {
        try {
          val[1] = caster(val[1]);
        } catch (err) {
          throw new CastError(caster.name.slice(4 /* 'cast'.length */), val[1], path);
        }
      }
    } else if (path != null && strictQuery === true) {
      return void 0;
    } else if (path != null && strictQuery === 'throw') {
      throw new StrictModeError(path);
    }
  } else {
    val[1] = _castExpression(val[1]);
  }

  return val;
}

function isPath(val) {
  return typeof val === 'string' && val.startsWith('$');
}

function isLiteral(val) {
  if (typeof val === 'string' && val.startsWith('$')) {
    return false;
  }
  if (typeof val === 'object' && val != null && Object.keys(val).find(key => key.startsWith('$'))) {
    // The `$literal` expression can make an object a literal
    // https://docs.mongodb.com/manual/reference/operator/aggregation/literal/#mongodb-expression-exp.-literal
    return val.$literal != null;
  }
  return true;
}