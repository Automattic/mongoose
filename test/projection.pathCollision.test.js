'use strict';

const mongoose = require('../');
const { Schema, model } = mongoose;
const assert = require('assert');

describe('Fix projection collision', function() {
  it('removes children when parent is excluded', async function() {
    const BarSchema = new Schema({
      name: String,
      subd: {
        raw: { type: String, select: false },
        clean: String
      }
    });

    const Bar = model('Bar', BarSchema, 'bars');

    const q = Bar.find({}).select('-subd');
    const proj = q._fields;

    assert.deepStrictEqual(proj, { subd: 0 });
  });
});

