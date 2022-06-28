'use strict';

const { Schema } = require('../common').mongoose;
const assert = require('assert');
const cast$expr = require('../../lib/helpers/query/cast$expr');

describe('castexpr', function() {
  it('casts comparisons', function() {
    const testSchema = new Schema({ date: Date, spent: Number, budget: Number, nums: [Number] });

    let res = cast$expr({ $eq: ['$date', '2021-06-01'] }, testSchema);
    assert.deepEqual(res, { $eq: ['$date', new Date('2021-06-01')] });

    res = cast$expr({ $eq: [{ $year: '$date' }, 2021] }, testSchema);
    assert.deepStrictEqual(res, { $eq: [{ $year: '$date' }, 2021] });

    res = cast$expr({ $eq: [{ $year: '$date' }, '2021'] }, testSchema);
    assert.deepStrictEqual(res, { $eq: [{ $year: '$date' }, 2021] });

    res = cast$expr({ $eq: [{ $year: '$date' }, { $literal: '2021' }] }, testSchema);
    assert.deepStrictEqual(res, { $eq: [{ $year: '$date' }, { $literal: 2021 }] });

    res = cast$expr({ $eq: [{ $year: '$date' }, { $literal: '2021' }] }, testSchema);
    assert.deepStrictEqual(res, { $eq: [{ $year: '$date' }, { $literal: 2021 }] });

    res = cast$expr({ $gt: ['$spent', '$budget'] }, testSchema);
    assert.deepStrictEqual(res, { $gt: ['$spent', '$budget'] });

    res = cast$expr({ $gt: [{ $last: '$nums' }, '42'] }, testSchema);
    assert.deepStrictEqual(res, { $gt: [{ $last: '$nums' }, 42] });
  });

  it('casts conditions', function() {
    const testSchema = new Schema({ price: Number, qty: Number });

    let discountedPrice = {
      $cond: {
        if: { $gte: ['$qty', { $floor: '100' }] },
        then: { $multiply: ['$price', '0.5'] },
        else: { $multiply: ['$price', '0.75'] }
      }
    };
    let res = cast$expr({ $lt: [discountedPrice, 5] }, testSchema);
    assert.deepStrictEqual(res, {
      $lt: [
        {
          $cond: {
            if: { $gte: ['$qty', { $floor: 100 }] },
            then: { $multiply: ['$price', 0.5] },
            else: { $multiply: ['$price', 0.75] }
          }
        },
        5
      ]
    });

    discountedPrice = {
      $cond: {
        if: { $and: [{ $gte: ['$qty', { $floor: '100' }] }] },
        then: { $multiply: ['$price', '0.5'] },
        else: { $multiply: ['$price', '0.75'] }
      }
    };
    res = cast$expr({ $lt: [discountedPrice, 5] }, testSchema);
    assert.deepStrictEqual(res, {
      $lt: [
        {
          $cond: {
            if: { $and: [{ $gte: ['$qty', { $floor: 100 }] }] },
            then: { $multiply: ['$price', 0.5] },
            else: { $multiply: ['$price', 0.75] }
          }
        },
        5
      ]
    });
  });

  it('casts boolean expressions', function() {
    const testSchema = new Schema({ date: Date, spent: Number, budget: Number });

    const res = cast$expr({ $and: [{ $eq: [{ $year: '$date' }, '2021'] }] }, testSchema);
    assert.deepStrictEqual(res, { $and: [{ $eq: [{ $year: '$date' }, 2021] }] });
  });

  it('cast errors', function() {
    const testSchema = new Schema({ date: Date, spent: Number, budget: Number });

    assert.throws(() => {
      cast$expr({ $eq: [{ $year: '$date' }, 'not a number'] }, testSchema);
    }, /Cast to Number failed/);
  });

  it('casts $in', function() {
    const testSchema = new Schema({ nums: [Number], docs: [new Schema({ prop: Number }, { _id: false })] });

    let res = cast$expr({ $in: ['42', '$nums'] }, testSchema);
    assert.deepStrictEqual(res, { $in: [42, '$nums'] });

    res = cast$expr({ $in: [{ prop: '42' }, '$docs'] }, testSchema);
    res.$in[0] = res.$in[0].toBSON(); // So `deepStrictEqual()` doesn't complain about subdoc internals
    assert.deepStrictEqual(res, { $in: [{ prop: 42 }, '$docs'] });
  });

  it('casts $not (gh-11689)', function() {
    const testSchema = new Schema({ nums: [Number], docs: [new Schema({ prop: Number }, { _id: false })] });

    const res = cast$expr({ $not: { $in: ['42', '$nums'] } }, testSchema);
    assert.deepStrictEqual(res, { $not: { $in: [42, '$nums'] } });
  });
});
