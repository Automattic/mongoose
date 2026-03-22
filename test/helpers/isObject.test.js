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

    it('null', () => {
      assert.ok(!isObject(null));
    });

    it('undefined', () => {
      assert.ok(!isObject(undefined));
    });

    it('number', () => {
      assert.ok(!isObject(0));
      assert.ok(!isObject(123));
      assert.ok(!isObject(-456));
    });

    it('boolean', () => {
      assert.ok(!isObject(true));
      assert.ok(!isObject(false));
    });

    it('Date', () => {
      assert.ok(!isObject(new Date()));
    });

    it('Map', () => {
      assert.ok(!isObject(new Map()));
    });

    it('Set', () => {
      assert.ok(!isObject(new Set()));
    });
  });
});
