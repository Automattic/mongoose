'use strict';

const CastError = require('../../error/cast');
const StrictModeError = require('../../error/strict');
const castNumber = require('../../cast/number');

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

  if (val.$eq != null) {
    val.$eq = castComparison(val.$eq, schema, strictQuery);
    if (val.$eq === void 0) {
      delete val.$eq;
    }
  }
  if (val.$lt != null) {
    val.$lt = castComparison(val.$lt, schema, strictQuery);
    if (val.$lt === void 0) {
      delete val.$lt;
    }
  }
  if (val.$lte != null) {
    val.$lte = castComparison(val.$lte, schema, strictQuery);
    if (val.$lte === void 0) {
      delete val.$lte;
    }
  }
  if (val.$gte != null) {
    val.$gte = castComparison(val.$gte, schema, strictQuery);
    if (val.$gte === void 0) {
      delete val.$gte;
    }
  }
  if (val.$multiply != null) {
    val.$multiply = castMath(val.$multiply, schema, strictQuery);
    if (val.$multiply === void 0) {
      delete val.$multiply;
    }
  }

  return val;
}

function castMath(val) {
  if (!Array.isArray(val)) {
    throw new Error('Math operator must be an array');
  }

  return val.map(v => {
    if (!isLiteral(v)) {
      return v;
    }
    try {
      return castNumber(v);
    } catch (err) {
      throw new CastError('Number', v, '$multiiply');
    }
  });
}

function castComparison(val, schema, strictQuery) {
  if (!Array.isArray(val) || val.length !== 2) {
    throw new Error('Comparison operator must be an array of length 2');
  }

  const lhs = val[0];

  if (lhs.$cond != null) {
    lhs.$cond.if = _castExpression(lhs.$cond.if, schema, strictQuery);
    lhs.$cond.then = _castExpression(lhs.$cond.then, schema, strictQuery);
    lhs.$cond.else = _castExpression(lhs.$cond.else, schema, strictQuery);
  }

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

    if (schematype != null) {
      val[1] = schematype.cast(val[1]);
    } else if (caster != null) {
      try {
        val[1] = caster(val[1]);
      } catch (err) {
        throw new CastError(caster.name.slice(4 /* 'cast'.length */), val[1], path);
      }
    } else if (strictQuery === true) {
      return void 0;
    } else if (strictQuery === 'throw') {
      throw new StrictModeError(path);
    }
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
  if (typeof val === 'object' && val != null && Object.keys(val).includes(key => key.startsWith('$'))) {
    return false;
  }
  return true;
}