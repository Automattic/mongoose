'use strict';

var Schema = require('../../lib/schema');
var assert = require('assert');
var getSchemaTypes = require('../../lib/services/populate/getSchemaTypes');

describe('getSchemaTypes', function() {
  it('handles embedded discriminators (gh-5970)', function(done) {
    var ItemSchema = new Schema({
      title: {
        type: String,
        required: true
      }
    }, {discriminatorKey: 'type'});

    var ItemBookSchema = new Schema({
      author: {
        type: String,
        ref: 'Ref1'
      }
    });

    var ItemEBookSchema = new Schema({
      author: {
        type: String,
        ref: 'Ref2'
      }
    });

    var OtherItem = new Schema({ name: String });

    var BundleSchema = new Schema({
      items: [{
        type: ItemSchema,
        required: false
      }]
    });

    BundleSchema.path('items').discriminator('Book', ItemBookSchema);
    BundleSchema.path('items').discriminator('EBook', ItemEBookSchema);
    BundleSchema.path('items').discriminator('Other', OtherItem);

    var doc = {
      items: [
        { type: 'Book', author: 'test 1' },
        { type: 'EBook', author: 'test 2' },
        { type: 'Other' }
      ]
    };

    var schemaTypes = getSchemaTypes(BundleSchema, doc, 'items.author');

    assert.ok(Array.isArray(schemaTypes));
    // Make sure we only got the schema paths for Book and EBook, and none
    // for the 'Other'
    assert.equal(schemaTypes.length, 2);
    assert.equal(schemaTypes[0].options.ref, 'Ref1');
    assert.equal(schemaTypes[1].options.ref, 'Ref2');

    done();
  });

  it('multiple embedded discriminators (gh-6064)', function(done) {
    var ItemSchema = new Schema({
      title: {
        type: String,
        required: true
      }
    }, {discriminatorKey: 'type'});

    var ItemBookSchema = new Schema({
      author: {
        type: String,
        ref: 'Ref1'
      }
    });

    var ItemEBookSchema = new Schema({
      author: {
        type: String,
        ref: 'Ref2'
      }
    });

    var OtherItem = new Schema({ name: String });

    var BundleSchema = new Schema({
      level1: {
        items: [{
          type: ItemSchema,
          required: false
        }]
      },
      level2: {
        items: [{
          type: ItemSchema,
          required: false
        }]
      }
    });

    BundleSchema.path('level1.items').discriminator('Book', ItemBookSchema);
    BundleSchema.path('level1.items').discriminator('EBook', ItemEBookSchema);
    BundleSchema.path('level1.items').discriminator('Other', OtherItem);

    // HERE IS THE ADDED DISCRIMINATOR PATH
    BundleSchema.path('level2.items').discriminator('Book', ItemBookSchema);
    BundleSchema.path('level2.items').discriminator('EBook', ItemEBookSchema);
    BundleSchema.path('level2.items').discriminator('Other', OtherItem);

    var doc = {
      level1: {
        items: [
          { type: 'Book', author: 'level 1 test 1' },
          { type: 'EBook', author: 'level 1 test 2' }
        ]
      },
      level2: {
        items: [
          { type: 'EBook', author: 'level 2 test 1' },
          { type: 'Book', author: 'level 2 test 2' },
          { type: 'Other' }
        ]
      }
    };
    var schemaTypes = getSchemaTypes(BundleSchema, doc, 'level2.items.author');

    assert.ok(Array.isArray(schemaTypes));
    // Make sure we only got the schema paths for Book and EBook, and none
    // for the 'Other'
    assert.equal(schemaTypes.length, 2);
    assert.equal(schemaTypes[0].options.ref, 'Ref1');
    assert.equal(schemaTypes[1].options.ref, 'Ref2');

    done();
  });
});
