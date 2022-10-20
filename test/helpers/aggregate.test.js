'use strict';

const assert = require('assert');
const prepareDiscriminatorPipeline = require('../../lib/helpers/aggregate/prepareDiscriminatorPipeline');
const stringifyFunctionOperators = require('../../lib/helpers/aggregate/stringifyFunctionOperators');

describe('stringifyFunctionOperators', function() {
  it('converts accumulator args to strings (gh-9364)', function() {
    const pipeline = [{
      $group: {
        _id: '$author',
        avgCopies: {
          $accumulator: {
            init: function() {
              return { count: 0, sum: 0 };
            },
            accumulate: function(state, numCopies) {
              return {
                count: state.count + 1,
                sum: state.sum + numCopies
              };
            },
            accumulateArgs: ['$copies'],
            merge: function(state1, state2) {
              return {
                count: state1.count + state2.count,
                sum: state1.sum + state2.sum
              };
            },
            finalize: function(state) {
              return (state.sum / state.count);
            },
            lang: 'js'
          }
        }
      }
    }];

    stringifyFunctionOperators(pipeline);

    assert.equal(typeof pipeline[0].$group.avgCopies.$accumulator.init, 'string');
    assert.equal(typeof pipeline[0].$group.avgCopies.$accumulator.accumulate, 'string');
    assert.equal(typeof pipeline[0].$group.avgCopies.$accumulator.merge, 'string');
    assert.equal(typeof pipeline[0].$group.avgCopies.$accumulator.finalize, 'string');
  });

  it('converts function args to strings (gh-9897)', function() {
    const pipeline = [{
      $addFields: {
        newField: {
          $function: {
            body: function() {
              return true;
            },
            args: ['$oldField'],
            lang: 'js'
          }
        }
      }
    }];

    stringifyFunctionOperators(pipeline);

    assert.equal(typeof pipeline[0].$addFields.newField.$function.body, 'string');
  });
});

describe('prepareDiscriminatorPipeline', function() {
  it('handles case where initial $match includes the discriminator key (gh-12478)', function() {
    const pipeline = [
      {
        $match: {
          partition: 'Child',
          $text: {
            $search: 'test'
          }
        }
      }
    ];
    const fakeSchema = { discriminatorMapping: { isRoot: false, key: 'partition', value: 'Child' } };

    prepareDiscriminatorPipeline(pipeline, fakeSchema);

    assert.deepStrictEqual(pipeline, [
      {
        $match: {
          partition: 'Child',
          $text: {
            $search: 'test'
          }
        }
      }
    ]);
  });
});
