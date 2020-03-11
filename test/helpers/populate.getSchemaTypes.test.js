'use strict';

const Schema = require('../../lib/schema');
const assert = require('assert');
const getSchemaTypes = require('../../lib/helpers/populate/getSchemaTypes');
const mongoose = require('../common').mongoose;

describe('getSchemaTypes', function() {
  it('handles embedded discriminators (gh-5970)', function(done) {
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

    const schemaTypes = getSchemaTypes(BundleSchema, doc, 'items.author');

    assert.ok(Array.isArray(schemaTypes));
    // Make sure we only got the schema paths for Book and EBook, and none
    // for the 'Other'
    assert.equal(schemaTypes.length, 2);
    assert.equal(schemaTypes[0].options.ref, 'Ref1');
    assert.equal(schemaTypes[1].options.ref, 'Ref2');

    done();
  });

  it('multiple embedded discriminators (gh-6064)', function(done) {
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
    const schemaTypes = getSchemaTypes(BundleSchema, doc, 'level2.items.author');

    assert.ok(Array.isArray(schemaTypes));
    // Make sure we only got the schema paths for Book and EBook, and none
    // for the 'Other'
    assert.equal(schemaTypes.length, 2);
    assert.equal(schemaTypes[0].options.ref, 'Ref1');
    assert.equal(schemaTypes[1].options.ref, 'Ref2');

    done();
  });

  it('handles already populated paths (gh-6798)', function(done) {
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

    const schematype = getSchemaTypes(DriverSchema, driver, 'cars.producer');
    assert.equal(schematype.options.ref, 'gh6798_Producer');

    done();
  });
});
