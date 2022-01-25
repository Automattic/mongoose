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
});
