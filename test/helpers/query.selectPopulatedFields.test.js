'use strict';

const assert = require('assert');
const selectPopulatedFields = require('../../lib/helpers/query/selectPopulatedFields');

describe('selectPopulatedFields', function() {
  it('selects refPath', function() {
    const fields = { name: 1 };
    const userProvidedFields = { name: 1 };
    const populateOptions = {
      parent: {
        refPath: 'parentModel'
      }
    };
    selectPopulatedFields(fields, userProvidedFields, populateOptions);
    assert.deepStrictEqual(fields, {
      name: 1,
      parent: 1,
      parentModel: 1
    });
  });

  it('adds refPath to projection if not deselected by user in exclusive projection', function() {
    const fields = { name: 0, parentModel: 0 };
    const userProvidedFields = { name: 0 };
    const populateOptions = {
      parent: {
        refPath: 'parentModel'
      }
    };
    selectPopulatedFields(fields, userProvidedFields, populateOptions);
    assert.deepStrictEqual(fields, {
      name: 0
    });
  });
});
