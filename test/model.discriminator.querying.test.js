/**
 * Test dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , Schema = mongoose.Schema
  , assert = require('assert')
  , random = require('../lib/utils').random
  , util = require('util');


/**
 * Setup
 */
function BaseSchema() {
  Schema.apply(this, arguments);

  this.add({
    name: String,
    createdAt: { type: Date, default: Date.now }
  });
}
util.inherits(BaseSchema, Schema);

var EventSchema = new BaseSchema();
var ImpressionEventSchema = new BaseSchema();
var ConversionEventSchema = new BaseSchema({ revenue: Number });

describe('model', function() {
  describe('discriminator()', function() {
    var db, BaseEvent, ImpressionEvent, ConversionEvent;

    before(function() {
      db = start();
      BaseEvent = db.model('model-discriminator-querying-event', EventSchema, 'model-discriminator-querying-'+random());
      ImpressionEvent = BaseEvent.discriminator('model-discriminator-querying-impression', ImpressionEventSchema);
      ConversionEvent = BaseEvent.discriminator('model-discriminator-querying-conversion', ConversionEventSchema);
    });

    afterEach(function(done) {
      BaseEvent.remove({}, function() {
        done();
      })
    });

    after(function(done) {
      db.close(done);
    });

    describe('find', function() {
      it('hydrates correct models', function(done) {
        var baseEvent  = new BaseEvent({ name: 'Base event' });
        var impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        var conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 1.337 });

        baseEvent.save(function(err) {
          assert.ifError(err);
          impressionEvent.save(function(err) {
            assert.ifError(err);
            conversionEvent.save(function(err) {
              assert.ifError(err);
              BaseEvent.find({}, function(err, docs) {
                assert.ifError(err);
                assert.ok(docs[0] instanceof BaseEvent);
                assert.ok(docs[0].schema instanceof BaseSchema);
                assert.equal(docs[0].name, 'Base event');

                assert.ok(docs[1] instanceof ImpressionEvent);
                assert.equal(docs[1].schema, ImpressionEventSchema);
                assert.ok(docs[1].schema instanceof BaseSchema);
                assert.equal(docs[1].name, 'Impression event');

                assert.ok(docs[2] instanceof ConversionEvent);
                assert.equal(docs[2].schema, ConversionEventSchema);
                assert.ok(docs[2].schema instanceof BaseSchema);
                assert.equal(docs[2].name, 'Conversion event');
                assert.equal(docs[2].revenue, 1.337);
                done();
              });
            });
          });
        });
      });

      it('discriminator model only finds documents of its type', function(done) {
        var impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        var conversionEvent1 = new ConversionEvent({ name: 'Conversion event 1', revenue: 1 });
        var conversionEvent2 = new ConversionEvent({ name: 'Conversion event 2', revenue: 2 });

        impressionEvent.save(function(err) {
          assert.ifError(err);
          conversionEvent1.save(function(err) {
            assert.ifError(err);
              conversionEvent2.save(function(err) {
                assert.ifError(err);
                // doesn't find anything since we're querying for an impression id
                var query = ConversionEvent.find({ _id: impressionEvent._id });
                assert.equal(query.op, 'find');
                assert.deepEqual(query._conditions, { _id: impressionEvent._id, __t: 'model-discriminator-querying-conversion' });

                query.exec(function(err, documents) {
                assert.ifError(err);
                assert.equal(documents.length, 0);

                // now find one with no criteria given and ensure it gets added to _conditions
                var query = ConversionEvent.find();
                assert.deepEqual(query._conditions, { __t: 'model-discriminator-querying-conversion' });
                assert.equal(query.op, 'find');
                query.exec(function(err, documents) {
                  assert.ifError(err);
                  assert.equal(documents.length, 2);

                  assert.ok(documents[0] instanceof ConversionEvent);
                  assert.equal(documents[0].__t, 'model-discriminator-querying-conversion');

                  assert.ok(documents[1] instanceof ConversionEvent);
                  assert.equal(documents[1].__t, 'model-discriminator-querying-conversion');
                  done();
                });
              });
            });
          });
        });
      });
    });

    describe('findOne', function() {
      it('hydrates correct model', function(done) {
        var baseEvent  = new BaseEvent({ name: 'Base event' });
        var impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        var conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 1.337 });

        baseEvent.save(function(err) {
          assert.ifError(err);
          impressionEvent.save(function(err) {
            assert.ifError(err);
            conversionEvent.save(function(err) {
              assert.ifError(err);
              // finds & hydrates BaseEvent
              BaseEvent.findOne({ _id: baseEvent._id }, function(err, event) {
                assert.ifError(err);
                assert.ok(event instanceof BaseEvent);
                assert.ok(event.schema instanceof BaseSchema);
                assert.equal(event.name, 'Base event');

                // finds & hydrates ImpressionEvent
                BaseEvent.findOne({ _id: impressionEvent._id }, function(err, event) {
                  assert.ifError(err);
                  assert.ok(event instanceof ImpressionEvent);
                  assert.equal(event.schema, ImpressionEventSchema);
                  assert.ok(event.schema instanceof BaseSchema);
                  assert.equal(event.name, 'Impression event');

                  // finds & hydrates ConversionEvent
                  BaseEvent.findOne({ _id: conversionEvent._id }, function(err, event) {
                    assert.ifError(err);
                    assert.ok(event instanceof ConversionEvent);
                    assert.equal(event.schema, ConversionEventSchema);
                    assert.ok(event.schema instanceof BaseSchema);
                    assert.equal(event.name, 'Conversion event');
                    done();
                  });
                });
              });
            });
          });
        });
      });

      it('discriminator model only finds a document of its type', function(done) {
        var impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        var conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 2 });

        impressionEvent.save(function(err) {
          assert.ifError(err);
          conversionEvent.save(function(err) {
            assert.ifError(err);
            // doesn't find anything since we're querying for an impression id
            var query = ConversionEvent.findOne({ _id: impressionEvent._id });
            assert.equal(query.op, 'findOne');
            assert.deepEqual(query._conditions, { _id: impressionEvent._id, __t: 'model-discriminator-querying-conversion' });

            query.exec(function(err, document) {
              assert.ifError(err);
              assert.equal(document, null);

              // now find one with no criteria given and ensure it gets added to _conditions
              var query = ConversionEvent.findOne();
              assert.equal(query.op, 'findOne');
              assert.deepEqual(query._conditions, { __t: 'model-discriminator-querying-conversion' });

              query.exec(function(err, document) {
                assert.ifError(err);
                assert.ok(document instanceof ConversionEvent);
                assert.equal(document.__t, 'model-discriminator-querying-conversion');
                done();
              });
            });
          });
        });
      });
    });



    describe('findOneAndUpdate', function() {
      it('does not update models of other types', function(done) {
        var baseEvent  = new BaseEvent({ name: 'Base event' });
        var impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        var conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 1.337 });

        baseEvent.save(function(err) {
          assert.ifError(err);
          impressionEvent.save(function(err) {
            assert.ifError(err);
            conversionEvent.save(function(err) {
              assert.ifError(err);
              var query = ConversionEvent.findOneAndUpdate({ name: 'Impression event' }, { $set: { name: 'Impression event - updated'}});
              assert.deepEqual(query._conditions, { name: 'Impression event', __t: 'model-discriminator-querying-conversion' });
              query.exec(function(err, document) {
                assert.ifError(err);
                assert.equal(document, null);
                done();
              });
            });
          });
        });
      });

      it('updates models of its own type', function(done) {
        var baseEvent  = new BaseEvent({ name: 'Base event' });
        var impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        var conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 1.337 });

        baseEvent.save(function(err) {
          assert.ifError(err);
          impressionEvent.save(function(err) {
            assert.ifError(err);
            conversionEvent.save(function(err) {
              assert.ifError(err);
              var query = ConversionEvent.findOneAndUpdate({ name: 'Conversion event' }, { $set: { name: 'Conversion event - updated'}});
              assert.deepEqual(query._conditions, { name: 'Conversion event', __t: 'model-discriminator-querying-conversion' });
              query.exec(function(err, document) {
                assert.ifError(err);
                var expected = conversionEvent.toJSON();
                expected.name = 'Conversion event - updated';
                assert.deepEqual(document.toJSON(), expected);
                done();
              });
            });
          });
        });
      });

      it('base model modifies any event type', function(done) {
        var baseEvent  = new BaseEvent({ name: 'Base event' });
        var impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        var conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 1.337 });

        baseEvent.save(function(err) {
          assert.ifError(err);
          impressionEvent.save(function(err) {
            assert.ifError(err);
            conversionEvent.save(function(err) {
              assert.ifError(err);
              var query = BaseEvent.findOneAndUpdate({ name: 'Conversion event' }, { $set: { name: 'Conversion event - updated'}});
              assert.deepEqual(query._conditions, { name: 'Conversion event' });
              query.exec(function(err, document) {
                assert.ifError(err);
                var expected = conversionEvent.toJSON();
                expected.name = 'Conversion event - updated';
                assert.deepEqual(document.toJSON(), expected);
                done();
              });
            });
          });
        });
      });
    });
  });
});
