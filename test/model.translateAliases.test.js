/**
 * Test dependencies.
 */

var start = require('./common'),
    assert = require('power-assert'),
    mongoose = start.mongoose;

describe('model translate aliases', function() {
  it('should translate correctly', function() {
    var Character = mongoose.model('Character', new mongoose.Schema({
      name: { type: String, alias: '名' },
      bio: {
        age: { type: Number, alias: '年齢' }
      }
    }));

    assert.deepEqual(
      // Translate aliases
      Character.translateAliases({
        '名': 'Stark',
        '年齢': 30
      }),
      // How translated aliases suppose to look like
      {
        name: 'Stark',
        'bio.age': 30
      }
    );
  });
});
