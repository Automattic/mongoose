'use strict';

const { Schema } = require('../common').mongoose;
const assert = require('assert');
const cast$expr = require('../../lib/helpers/query/cast$expr');

describe('castexpr', function() {
  it('casts comparisons', function() {
    const testSchema = new Schema({ date: Date, spent: Number, budget: Number });

    let res = cast$expr({ $eq: ['$date', '2021-06-01'] }, testSchema);
    assert.deepEqual(res, { $eq: ['$date', new Date('2021-06-01')] });

    res = cast$expr({ $eq: [{ $year: '$date' }, '2021'] }, testSchema);
    assert.deepStrictEqual(res, { $eq: [{ $year: '$date' }, 2021] });

    res = cast$expr({ $gt: ['$spent', '$budget'] }, testSchema);
    assert.deepStrictEqual(res, { $gt: ['$spent', '$budget'] });
  });

  it('casts conditions', function() {
    const testSchema = new Schema({ price: Number, qty: Number });

    const discountedPrice = {
      $cond: {
        if: { $gte: ['$qty', '100'] },
        then: { $multiply: ['$price', '0.5'] },
        else: { $multiply: ['$price', '0.75'] }
      }
    };
    const res = cast$expr({ $lt: [discountedPrice, 5] }, testSchema);
    assert.deepStrictEqual(res, {
      $lt: [
        {
          $cond: {
            if: { $gte: ['$qty', 100] },
            then: { $multiply: ['$price', 0.5] },
            else: { $multiply: ['$price', 0.75] }
          }
        },
        5
      ]
    });
  });
});