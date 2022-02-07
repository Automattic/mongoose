'use strict';

const assert = require('assert');
const isObject = require('../../lib/helpers/isObject');

describe('isObject', () => {
  describe('true for', () => {
    it('{}', () => {
      assert.ok(isObject({}));
    });

    it('Buffer', () => {
      assert.ok(isObject(Buffer.from([])));
    });

    it('Object', () => {
      assert.ok(isObject(new Object()));
    });
  });

  describe('false for', () => {
    it('""', () => {
      assert.ok(!isObject(''));
    });

    it('/.*/', () => {
      assert.ok(!isObject(/.*/));
    });

    it('[]', () => {
      assert.ok(!isObject([]));
    });

    it('Array', () => {
      assert.ok(!isObject(new Array()));
    });

    it('Function', () => {
      assert.ok(!isObject(new Function()));
    });

    it('RegExp', () => {
      assert.ok(!isObject(new RegExp()));
    });

    it('String', () => {
      assert.ok(!isObject(new String()));
    });

    it('"[object Object]"', () => {
      assert.ok(!isObject('[object Object]'));
    });
  });
});
