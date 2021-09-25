/**
 * Test dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;

describe('model translate aliases', function() {
  it('should translate correctly', function() {
    const Syntax = new mongoose.Schema({
      s: { type: String, alias: 'syntax' }
    });

    const Character = mongoose.model('Character', new mongoose.Schema({
      d: { type: Syntax, alias: 'dot' },
      noAlias: { type: Syntax },
      name: { type: String, alias: '名' },
      bio: {
        age: { type: Number, alias: '年齢' }
      }
    }));

    assert.deepEqual(
      // Translate aliases
      Character.translateAliases({
        _id: '1',
        名: 'Stark',
        'noAlias.syntax': 'NoAliasSyntax',
        年齢: 30,
        'dot.syntax': 'DotSyntax',
        $and: [{ $or: [{ 名: 'Stark' }, { 年齢: 30 }] }, { 'dot.syntax': 'DotSyntax' }]
      }),
      // How translated aliases suppose to look like
      {
        name: 'Stark',
        _id: '1',
        'bio.age': 30,
        'noAlias.s': 'NoAliasSyntax',
        'd.s': 'DotSyntax',
        $and: [{ $or: [{ name: 'Stark' }, { 'bio.age': 30 }] }, { 'd.s': 'DotSyntax' }]
      }
    );

    assert.deepEqual(
      // Translate aliases
      Character.translateAliases(new Map([
        ['_id', '1'],
        ['名', 'Stark'],
        ['年齢', 30],
        ['dot.syntax', 'DotSyntax'],
        ['noAlias.syntax', 'NoAliasSyntax']
      ])),
      // How translated aliases suppose to look like
      new Map([
        ['name', 'Stark'],
        ['_id', '1'],
        ['bio.age', 30],
        ['d.s', 'DotSyntax'],
        ['noAlias.s', 'NoAliasSyntax']
      ])
    );
  });
});
