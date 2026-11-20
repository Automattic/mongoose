'use strict';

const assert = require('assert');

require('../common'); // required for side-effect setup (so that the default driver is set-up)
const Document = require('../../lib/document');
const InternalCache = require('../../lib/internal');
const Schema = require('../../lib/schema');
const isMongooseObject = require('../../lib/helpers/isMongooseObject');
const MongooseArray = require('../../lib/types/array');
const MongooseBuffer = require('../../lib/types/buffer');
const MongooseMap = require('../../lib/types/map');

describe('isMongooseObject', () => {
  it('is when value is a document', () => {
    assert.ok(isMongooseObject(new Document({}, new Schema({}))));
  });

  it('is not when value is a spread document', () => {
    assert.ok(!isMongooseObject({ ...new Document({}, new Schema({})) }));
    assert.ok(!isMongooseObject({ $__: new InternalCache(), _doc: {} }));
  });

  it('is when value is a MongooseArray', () => {
    const mongooseArray = new MongooseArray();
    assert.ok(isMongooseObject(mongooseArray));
  });

  it('is when value is a MongooseBuffer', () => {
    assert.ok(isMongooseObject(new MongooseBuffer([1, 2])));
  });

  it('is when value is a MongooseMap', () => {
    assert.ok(isMongooseObject(new MongooseMap({})));
  });

  it('is not when value is user data with Mongoose markers', () => {
    assert.ok(!isMongooseObject({ $__: !null }));
    assert.ok(!isMongooseObject({ $isMongooseDocumentPrototype: true }));
    assert.ok(!isMongooseObject(JSON.parse('{"constructor":{"prototype":{"$isMongooseDocumentPrototype":true}}}')));
    assert.ok(!isMongooseObject({ isMongooseBuffer: true }));
    assert.ok(!isMongooseObject({ $isMongooseMap: true }));
    assert.ok(!isMongooseObject(JSON.parse('{"constructor":{"prototype":{"$isMongooseMap":true}}}')));
  });

  it('is not when anything else', () => {
    assert.ok(!isMongooseObject(''));
    assert.ok(!isMongooseObject([]));
    assert.ok(!isMongooseObject({}));
    assert.ok(!isMongooseObject(/./));
    assert.ok(!isMongooseObject(null));
    assert.ok(!isMongooseObject(false));
    assert.ok(!isMongooseObject(undefined));
    assert.ok(!isMongooseObject(new Array()));
    assert.ok(!isMongooseObject(new Function()));
    assert.ok(!isMongooseObject(new Object()));
    assert.ok(!isMongooseObject(new RegExp()));
    assert.ok(!isMongooseObject(new String()));
    assert.ok(!isMongooseObject(Buffer.from([])));
  });
});
