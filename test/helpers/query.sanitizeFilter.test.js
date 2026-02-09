'use strict';

const assert = require('assert');
const { trusted } = require('../../lib/helpers/query/trusted');
const sanitizeFilter = require('../../lib/helpers/query/sanitizeFilter');

describe('sanitizeFilter', function() {
  it('throws when filter includes a query selector', function() {
    let obj = { username: 'val', pwd: 'my secret' };
    sanitizeFilter(obj);
    assert.deepEqual(obj, { username: 'val', pwd: 'my secret' });

    obj = { username: 'val', pwd: { $ne: null } };
    sanitizeFilter(obj);
    assert.deepEqual(obj, { username: 'val', pwd: { $eq: { $ne: null } } });
  });

  it('ignores explicitly defined query selectors', function() {
    let obj = { username: 'val', pwd: 'my secret' };
    sanitizeFilter(obj);
    assert.deepEqual(obj, { username: 'val', pwd: 'my secret' });

    obj = { username: 'val', pwd: trusted({ $type: 'string', $eq: 'my secret' }) };
    sanitizeFilter(obj);
    assert.deepEqual(obj, { username: 'val', pwd: { $type: 'string', $eq: 'my secret' } });
  });

  it('handles $and, $or, $nor', function() {
    let obj = { $and: [{ username: 'val' }, { pwd: { $ne: 'my secret' } }] };
    sanitizeFilter(obj);
    assert.deepEqual(obj, { $and: [{ username: 'val' }, { pwd: { $eq: { $ne: 'my secret' } } }] });

    obj = { $or: [{ username: 'val' }, { pwd: { $ne: 'my secret' } }] };
    sanitizeFilter(obj);
    assert.deepEqual(obj, { $or: [{ username: 'val' }, { pwd: { $eq: { $ne: 'my secret' } } }] });

    obj = { $nor: [{ username: 'val' }, { pwd: { $ne: 'my secret' } }] };
    sanitizeFilter(obj);
    assert.deepEqual(obj, { $nor: [{ username: 'val' }, { pwd: { $eq: { $ne: 'my secret' } } }] });
  });

  it('handles $not', function() {
    const obj = { username: 'val', pwd: { $not: { $ne: 'my secret' } } };
    sanitizeFilter(obj);
    assert.deepEqual(obj, { username: 'val', pwd: { $eq: { $not: { $ne: 'my secret' } } } });
  });

  it('handles $jsonSchema', function() {
    const obj = {
      $jsonSchema: {
        bsonType: 'object',
        required: ['pwd'],
        properties: { pwd: { bsonType: 'string' } }
      }
    };
    assert.throws(
      () => sanitizeFilter(obj),
      /\$jsonSchema is not allowed with sanitizeFilter/
    );

    obj.$jsonSchema = trusted(obj.$jsonSchema);
    sanitizeFilter(obj);
    assert.deepEqual(obj, {
      $jsonSchema: {
        bsonType: 'object',
        required: ['pwd'],
        properties: { pwd: { bsonType: 'string' } }
      }
    });
  });

  it('handles $where', function() {
    const obj = { $where: 'true' };
    assert.throws(
      () => sanitizeFilter(obj),
      /\$where is not allowed with sanitizeFilter/
    );

    const whereFunc = function() { return true; };
    obj.$where = trusted(whereFunc);
    sanitizeFilter(obj);
    assert.deepEqual(obj, { $where: whereFunc });
  });

  it('handles $expr', function() {
    const func = function() { return true; };
    const obj = {
      $expr: {
        $function: { body: func }
      }
    };
    assert.throws(
      () => sanitizeFilter(obj),
      /\$expr is not allowed with sanitizeFilter/
    );

    obj.$expr = trusted(obj.$expr);
    sanitizeFilter(obj);
    assert.deepEqual(obj, { $expr: { $function: { body: func } } });
  });

  it('handles $text', function() {
    const obj = {
      $text: {
        $search: 'test'
      }
    };
    assert.throws(
      () => sanitizeFilter(obj),
      /\$text is not allowed with sanitizeFilter/
    );

    obj.$text = trusted(obj.$text);
    sanitizeFilter(obj);
    assert.deepEqual(obj, { $text: { $search: 'test' } });
  });
});
