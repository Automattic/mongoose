'use strict';

const assert = require('assert');
const setDottedPath = require('../../lib/helpers/path/setDottedPath');

describe('setDottedPath', function() {
  it('setDottedPath root element', function() {
    const obj = {
      clearingInstituteName: 'Our local bank',
      'transaction.receipt': 'I am a transaction receipt',
      'transaction.authorizationCode': 'ABCDEF',
      'transaction.acquirer.settlementDate': 'February 2021',
      'sourceOfFunds.provided.card.issuer': 'Big bank corporation',
      nonExistentField: 'I should not be present'
    };
    setDottedPath(obj, 'authorizationResponse', '123456');
    assert.deepEqual(obj, {
      'sourceOfFunds.provided.card.issuer': 'Big bank corporation',
      'transaction.acquirer.settlementDate': 'February 2021',
      'transaction.authorizationCode': 'ABCDEF',
      'transaction.receipt': 'I am a transaction receipt',
      authorizationResponse: '123456',
      clearingInstituteName: 'Our local bank',
      nonExistentField: 'I should not be present'
    });
  });
  it('setDottedPath sub element', function() {
    const obj = {
      clearingInstituteName: 'Our local bank',
      'transaction.receipt': 'I am a transaction receipt',
      'transaction.authorizationCode': 'ABCDEF',
      'transaction.acquirer.settlementDate': 'February 2021',
      'sourceOfFunds.provided.card.issuer': 'Big bank corporation',
      nonExistentField: 'I should not be present'
    };
    setDottedPath(obj, 'authorizationResponse.stan', '123456');
    assert.deepEqual(obj, {
      'sourceOfFunds.provided.card.issuer': 'Big bank corporation',
      'transaction.acquirer.settlementDate': 'February 2021',
      'transaction.authorizationCode': 'ABCDEF',
      'transaction.receipt': 'I am a transaction receipt',
      authorizationResponse: {
        stan: '123456'
      },
      clearingInstituteName: 'Our local bank',
      nonExistentField: 'I should not be present'
    });
  });
  it('does not set values underneath inherited properties like toString', function() {
    const obj = { nested: {} };

    try {
      setDottedPath(obj, 'toString.call', 1);
      setDottedPath(obj, 'nested.valueOf.polluted', 'yes');

      assert.strictEqual(typeof Object.prototype.toString.call, 'function');
      assert.strictEqual(Object.prototype.valueOf.polluted, undefined);
      assert.deepStrictEqual(obj, { nested: {} });

      setDottedPath(obj, 'nested.a.b', 'test');
      assert.deepStrictEqual(obj, { nested: { a: { b: 'test' } } });
    } finally {
      // Clean up so a failure here doesn't break subsequent tests
      delete Object.prototype.toString.call;
      delete Object.prototype.valueOf.polluted;
    }
  });
});
