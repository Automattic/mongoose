'use strict';

const assert = require('assert');

const mongoose = require('../common').mongoose;
const Schema = require('../../lib/schema');
const getSchemaTypes = require('../../lib/helpers/populate/getSchemaTypes');

describe('getSchemaTypes', function() {
  it('handles embedded discriminators (gh-5970)', function() {
    const ItemSchema = new Schema({
      title: {
        type: String,
        required: true
      }
    }, { discriminatorKey: 'type' });

    const ItemBookSchema = new Schema({
      author: {
        type: String,
        ref: 'Ref1'
      }
    });

    const ItemEBookSchema = new Schema({
      author: {
        type: String,
        ref: 'Ref2'
      }
    });

    const OtherItem = new Schema({ name: String });

    const BundleSchema = new Schema({
      items: [{
        type: ItemSchema,
        required: false
      }]
    });

    BundleSchema.path('items').discriminator('Book', ItemBookSchema);
    BundleSchema.path('items').discriminator('EBook', ItemEBookSchema);
    BundleSchema.path('items').discriminator('Other', OtherItem);

    const doc = {
      items: [
        { type: 'Book', author: 'test 1' },
        { type: 'EBook', author: 'test 2' },
        { type: 'Other' }
      ]
    };

    const schemaTypes = getSchemaTypes(null, BundleSchema, doc, 'items.author');

    assert.ok(Array.isArray(schemaTypes));
    // Make sure we only got the schema paths for Book and EBook, and none
    // for the 'Other'
    assert.equal(schemaTypes.length, 2);
    assert.equal(schemaTypes[0].options.ref, 'Ref1');
    assert.equal(schemaTypes[1].options.ref, 'Ref2');
  });

  it('multiple embedded discriminators (gh-6064)', function() {
    const ItemSchema = new Schema({
      title: {
        type: String,
        required: true
      }
    }, { discriminatorKey: 'type' });

    const ItemBookSchema = new Schema({
      author: {
        type: String,
        ref: 'Ref1'
      }
    });

    const ItemEBookSchema = new Schema({
      author: {
        type: String,
        ref: 'Ref2'
      }
    });

    const OtherItem = new Schema({ name: String });

    const BundleSchema = new Schema({
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

    const doc = {
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
    const schemaTypes = getSchemaTypes(null, BundleSchema, doc, 'level2.items.author');

    assert.ok(Array.isArray(schemaTypes));
    // Make sure we only got the schema paths for Book and EBook, and none
    // for the 'Other'
    assert.equal(schemaTypes.length, 2);
    assert.equal(schemaTypes[0].options.ref, 'Ref1');
    assert.equal(schemaTypes[1].options.ref, 'Ref2');
  });

  it('handles already populated paths (gh-6798)', function() {
    const DriverSchema = new mongoose.Schema({
      name: 'String',
      cars: [{ type: 'ObjectId', required: false, ref: 'gh6798_Car' }]
    });

    const CarSchema = new mongoose.Schema({
      name: 'String',
      producer: { type: 'ObjectId', required: false, ref: 'gh6798_Producer' }
    });

    const ProducerSchema = new mongoose.Schema({
      name: 'String'
    });

    const Driver = mongoose.model('gh6798_Driver', DriverSchema);
    const Car = mongoose.model('gh6798_Car', CarSchema);
    mongoose.model('gh6798_Producer', ProducerSchema);

    const car = new Car({ name: '1970 Dodge Charger' });
    const driver = new Driver({ name: 'Dominic Toretto', cars: [car] });

    assert.equal(driver.cars[0].name, '1970 Dodge Charger');
    assert.ok(driver.populated('cars'));

    const schematype = getSchemaTypes(null, DriverSchema, driver, 'cars.producer');
    assert.equal(schematype.options.ref, 'gh6798_Producer');
  });

  it('handles embedded discriminators in nested arrays (gh-9984)', function() {
    const mapSchema = new Schema({
      tiles: [[new Schema({}, { discriminatorKey: 'kind', _id: false })]]
    });

    const contentPath = mapSchema.path('tiles');

    contentPath.discriminator('Enemy', new Schema({
      enemy: { type: Schema.Types.ObjectId, ref: 'Enemy' }
    }));
    contentPath.discriminator('Wall', new Schema({ color: String }));

    const schemaTypes = getSchemaTypes(null, mapSchema, null, 'tiles.enemy');
    assert.ok(Array.isArray(schemaTypes));
    assert.equal(schemaTypes.length, 1);
    assert.equal(schemaTypes[0].options.ref, 'Enemy');
  });

  it('finds path underneath nested subdocument with map of mixed (gh-12530)', function() {
    const schema = new Schema({
      child: new Schema({
        testMap: {
          type: Map,
          of: 'Mixed'
        }
      })
    });

    const schemaTypes = getSchemaTypes(null, schema, null, 'child.testMap.foo.bar');
    assert.equal(schemaTypes.instance, 'Mixed');
  });
});
