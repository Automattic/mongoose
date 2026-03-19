'use strict';

const assert = require('assert');
const ValidatorError = require('../lib/error/validator');

describe('ValidatorError formatMessage', function() {
  it('replaces all occurrences of properties in a message', function() {
    const props = { path: 'name', value: 42 };
    const message = '{PATH} {PATH} {VALUE} {VALUE}';

    const result = ValidatorError.prototype.formatMessage(message, props);
    assert.equal(result, 'name name 42 42');
    assert.ok(!result.includes('{PATH}'));
    assert.ok(!result.includes('{VALUE}'));
  });
});

