'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('./common').mongoose;

const assert = require('assert');

const Schema = mongoose.Schema;

describe('SubdocumentPath', function() {
  describe('discriminator()', function() {
    describe('recursive nested discriminators', function() {
      it('allow multiple levels of data in the schema', function() {
        const singleEventSchema = new Schema({
          message: String
        }, { _id: false, discriminatorKey: 'kind' });

        const subEventSchema = new Schema({
          sub_events: [singleEventSchema]
        }, { _id: false });

        subEventSchema.path('sub_events').discriminator('SubEvent', subEventSchema, { clone: false });

        let currentEventLevel = subEventSchema;
        for (let i = 0; i < 5; i++) {
          const subEventSchemaDiscriminators = currentEventLevel.path('sub_events').schema.discriminators;
          assert.ok(subEventSchemaDiscriminators);
          assert.ok(subEventSchemaDiscriminators.SubEvent);
          currentEventLevel = subEventSchemaDiscriminators.SubEvent;
        }
      });

      it('allow multiple levels of data in a document', function() {
        const singleEventSchema = new Schema({
          message: String
        }, { _id: false, discriminatorKey: 'kind' });

        const subEventSchema = new Schema({
          sub_events: [singleEventSchema]
        }, { _id: false });

        subEventSchema.path('sub_events').discriminator('SubEvent', subEventSchema, { clone: false });

        const SubEvent = mongoose.model('MultiLevelDataDoc', subEventSchema);
        const multiLevel = {
          // To create a recursive document, the schema was modified, so kind & message are added
          kind: 'SubEvent',
          message: 'level 1',
          sub_events: [{
            kind: 'SubEvent',
            message: 'level 2',
            sub_events: [{
              kind: 'SubEvent',
              message: 'level 3',
              sub_events: [{
                kind: 'SubEvent',
                message: 'level 4',
                sub_events: [{
                  kind: 'SubEvent',
                  message: 'level 5',
                  sub_events: []
                }]
              }]
            }]
          }]
        };
        const subEvent = SubEvent(multiLevel);

        assert.deepStrictEqual(multiLevel, subEvent.toJSON());
      });

      it('allow multiple levels of data in the schema when the base schema has _id without auto', function() {
        const singleEventSchema = new Schema({
          _id: { type: Number, required: true },
          message: String
        }, { discriminatorKey: 'kind' });

        const subEventSchema = new Schema({
          sub_events: [singleEventSchema]
        });

        subEventSchema.path('sub_events').discriminator('SubEvent', subEventSchema, { clone: false });

        // To create a recursive document, the schema was modified, so the _id property is now a number
        assert.equal(subEventSchema.path('_id').instance, 'Number');

        let currentEventLevel = subEventSchema;
        for (let i = 0; i < 5; i++) {
          const subEventSchemaDiscriminators = currentEventLevel.path('sub_events').schema.discriminators;
          assert.ok(subEventSchemaDiscriminators);
          assert.ok(subEventSchemaDiscriminators.SubEvent);
          currentEventLevel = subEventSchemaDiscriminators.SubEvent;
          assert.equal(currentEventLevel.path('_id').instance, 'Number');
        }
      });

      it('allow multiple levels of data in a document when the base schema has _id without auto', function() {
        const singleEventSchema = new Schema({
          _id: { type: Number, required: true },
          message: String
        }, { discriminatorKey: 'kind' });

        const subEventSchema = new Schema({
          sub_events: [singleEventSchema]
        });

        subEventSchema.path('sub_events').discriminator('SubEvent', subEventSchema, { clone: false });

        const SubEvent = mongoose.model('MultiLevelDataWithIdDoc', subEventSchema);
        const multiLevel = {
          // To create a recursive document, the schema was modified, so kind & message are added & _id is now Number
          _id: 1,
          kind: 'SubEvent',
          message: 'level 1',
          sub_events: [{
            _id: 1,
            kind: 'SubEvent',
            message: 'level 2',
            sub_events: [{
              _id: 1,
              kind: 'SubEvent',
              message: 'level 3',
              sub_events: [{
                _id: 1,
                kind: 'SubEvent',
                message: 'level 4',
                sub_events: [{
                  _id: 1,
                  kind: 'SubEvent',
                  message: 'level 5',
                  sub_events: []
                }]
              }]
            }]
          }]
        };
        const subEvent = SubEvent(multiLevel);

        assert.deepStrictEqual(multiLevel, subEvent.toJSON());
      });
    });
  });

  it('copies over `requiredValidator` (gh-8819)', function() {
    const authorSchema = new mongoose.Schema({
      name: String,
      pseudonym: String
    });

    const bookSchema = new mongoose.Schema({
      author: {
        type: authorSchema,
        required: true
      }
    });

    const clone = bookSchema.clone();
    assert.ok(clone.path('author').requiredValidator);
    assert.strictEqual(clone.path('author').requiredValidator,
      clone.path('author').validators[0].validator);
  });

  it('supports `set()` (gh-8883)', function() {
    mongoose.deleteModel(/Test/);
    mongoose.Schema.Types.Subdocument.set('required', true);

    const Model = mongoose.model('Test', mongoose.Schema({
      nested: mongoose.Schema({
        test: String
      })
    }));

    const doc = new Model({});

    const err = doc.validateSync();
    assert.ok(err);
    assert.ok(err.errors['nested']);

    delete mongoose.Schema.Types.Subdocument.defaultOptions.required;
  });

  it('supports setting _id globally (gh-11541) (gh-8883)', function() {
    mongoose.deleteModel(/Test/);
    mongoose.Schema.Types.Subdocument.set('_id', false);

    const Model = mongoose.model('Test', mongoose.Schema({
      nested: mongoose.Schema({
        test: String
      })
    }));

    const doc = new Model({ nested: {} });

    assert.ok(!doc.nested._id);

    delete mongoose.Schema.Types.Subdocument.defaultOptions._id;
  });
});
