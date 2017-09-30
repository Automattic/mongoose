/**
 * Test dependencies.
 */

var start = require('./common'),
    mongoose = start.mongoose,
    Schema = mongoose.Schema,
    assert = require('power-assert'),
    random = require('../lib/utils').random,
    util = require('util'),
    async = require('async');


/**
 * Setup
 */
function BaseSchema() {
  Schema.apply(this, arguments);

  this.add({
    name: String,
    createdAt: {type: Date, default: Date.now}
  });
}
util.inherits(BaseSchema, Schema);

var EventSchema = new BaseSchema();
var ImpressionEventSchema = new BaseSchema();
var ConversionEventSchema = new BaseSchema({revenue: Number});
var SecretEventSchema = new BaseSchema({ secret: { type: String, select: false } });

describe('model', function() {
  describe('discriminator()', function() {
    var db;
    var BaseEvent;
    var ImpressionEvent;
    var ConversionEvent;
    var SecretEvent;

    before(function() {
      db = start();
      BaseEvent = db.model('model-discriminator-querying-event', EventSchema, 'model-discriminator-querying-' + random());
      ImpressionEvent = BaseEvent.discriminator('model-discriminator-querying-impression', ImpressionEventSchema);
      ConversionEvent = BaseEvent.discriminator('model-discriminator-querying-conversion', ConversionEventSchema);
      SecretEvent = BaseEvent.discriminator('model-discriminator-querying-secret', SecretEventSchema);
    });

    afterEach(function(done) {
      async.series(
        [
          function removeBaseEvent(next) {
            BaseEvent.remove(next);
          },
          function removeImpressionEvent(next) {
            ImpressionEvent.remove(next);
          },
          function removeConversionEvent(next) {
            ConversionEvent.remove(next);
          }
        ],
        done
      );
    });

    after(function(done) {
      db.close(done);
    });

    describe('pushing discriminated objects', function() {
      var ContainerModel, BaseCustomEvent, DiscCustomEvent;
      before(function() {
        var BaseCustomEventSchema = new BaseSchema();
        var DiscCustomEventSchema = new BaseSchema({
          personName: Number
        });
        BaseCustomEvent = db.model('base-custom-event',
                                   BaseCustomEventSchema);
        DiscCustomEvent = BaseCustomEvent.discriminator('disc-custom-event',
                                                        DiscCustomEventSchema);
        var ContainerSchema = new Schema({
          title: String,
          events: [{type: Schema.Types.ObjectId, ref: 'base-custom-event'}]
        });
        ContainerModel = db.model('container-event-model', ContainerSchema);
      });

      it('into non-discriminated arrays works', function(done) {
        var c = new ContainerModel({
          title: 'events-group-1'
        });
        var d1 = new BaseCustomEvent();
        var d2 = new BaseCustomEvent();
        var d3 = new DiscCustomEvent();
        c.events.push(d1);
        c.events.push(d2);
        async.series(
          [
            function(next) { d1.save(next); },
            function(next) { d2.save(next); },
            function(next) { d3.save(next); },
            function(next) { c.save(next); },
            function(next) {
              ContainerModel.findOne({}).populate('events').exec(function(err, doc) {
                assert.ifError(err);
                assert.ok(doc.events && doc.events.length);
                assert.equal(doc.events.length, 2);
                doc.events.push(d3);
                var hasDisc = false;
                var discKey = DiscCustomEvent.schema.discriminatorMapping.key;
                doc.events.forEach(function(subDoc) {
                  if (discKey in subDoc) {
                    hasDisc = true;
                  }
                });
                assert.ok(hasDisc);
                next();
              });
            }
          ],
          done
        );
      });
    });

    describe('find', function() {
      it('hydrates correct models', function(done) {
        var baseEvent = new BaseEvent({name: 'Base event'});
        var impressionEvent = new ImpressionEvent({name: 'Impression event'});
        var conversionEvent = new ConversionEvent({name: 'Conversion event', revenue: 1.337});

        baseEvent.save(function(err) {
          assert.ifError(err);
          impressionEvent.save(function(err) {
            assert.ifError(err);
            conversionEvent.save(function(err) {
              assert.ifError(err);
              BaseEvent.find({}).sort('name').exec(function(err, docs) {
                assert.ifError(err);
                assert.ok(docs[0] instanceof BaseEvent);
                assert.equal(docs[0].name, 'Base event');

                assert.ok(docs[1] instanceof ConversionEvent);
                assert.equal(docs[1].schema, ConversionEventSchema);
                assert.equal(docs[1].name, 'Conversion event');
                assert.equal(docs[1].revenue, 1.337);

                assert.ok(docs[2] instanceof ImpressionEvent);
                assert.equal(docs[2].schema, ImpressionEventSchema);
                assert.equal(docs[2].name, 'Impression event');
                done();
              });
            });
          });
        });
      });

      var checkHydratesCorrectModels = function(fields, done) {
        var baseEvent = new BaseEvent({name: 'Base event'});
        var impressionEvent = new ImpressionEvent({name: 'Impression event'});
        var conversionEvent = new ConversionEvent({name: 'Conversion event', revenue: 1.337});

        baseEvent.save(function(err) {
          assert.ifError(err);
          impressionEvent.save(function(err) {
            assert.ifError(err);
            conversionEvent.save(function(err) {
              assert.ifError(err);
              BaseEvent.find({}, fields).sort('name').exec(function(err, docs) {
                assert.ifError(err);
                assert.ok(docs[0] instanceof BaseEvent);
                assert.equal(docs[0].name, 'Base event');

                assert.ok(docs[1] instanceof ConversionEvent);
                assert.equal(docs[1].schema, ConversionEventSchema);
                assert.equal(docs[1].name, 'Conversion event');
                assert.equal(docs[1].revenue, undefined);

                assert.ok(docs[2] instanceof ImpressionEvent);
                assert.equal(docs[2].schema, ImpressionEventSchema);
                assert.equal(docs[2].name, 'Impression event');
                done();
              });
            });
          });
        });
      };

      it('hydrates correct models when fields selection set as string', function(done) {
        checkHydratesCorrectModels('name', done);
      });

      it('hydrates correct models when fields selection set as object', function(done) {
        checkHydratesCorrectModels({name: 1}, done);
      });

      describe('discriminator model only finds documents of its type', function() {
        var impressionEvent, conversionEvent1, conversionEvent2;

        before(function() {
          impressionEvent = new ImpressionEvent({name: 'Impression event'});
          conversionEvent1 = new ConversionEvent({name: 'Conversion event 1', revenue: 1});
          conversionEvent2 = new ConversionEvent({name: 'Conversion event 2', revenue: 2});
        });

        describe('using "ModelDiscriminator#findById"', function() {
          it('to find a document of the appropriate discriminator', function(done) {
            impressionEvent.save(function(err) {
              assert.ifError(err);

              // via BaseEvent model
              BaseEvent.findById(impressionEvent._id, function(err, doc) {
                assert.ifError(err);
                assert.ok(doc);
                assert.equal(impressionEvent.__t, doc.__t);

                // via ImpressionEvent model discriminator -- should be present
                ImpressionEvent.findById(impressionEvent._id, function(err, doc) {
                  assert.ifError(err);
                  assert.ok(doc);
                  assert.equal(impressionEvent.__t, doc.__t);

                  // via ConversionEvent model discriminator -- should not be present
                  ConversionEvent.findById(impressionEvent._id, function(err, doc) {
                    assert.ifError(err);
                    assert.ok(!doc);

                    done();
                  });
                });
              });
            });
          });
        });

        describe('using "ModelDiscriminator#find"', function() {
          it('to find documents of the appropriate discriminator', function(done) {
            impressionEvent.save(function(err) {
              assert.ifError(err);
              conversionEvent1.save(function(err) {
                assert.ifError(err);
                conversionEvent2.save(function(err) {
                  assert.ifError(err);
                  // doesn't find anything since we're querying for an impression id
                  var query = ConversionEvent.find({_id: impressionEvent._id});
                  assert.equal(query.op, 'find');
                  assert.deepEqual(query._conditions, {_id: impressionEvent._id, __t: 'model-discriminator-querying-conversion'});
                  query.exec(function(err, documents) {
                    assert.ifError(err);
                    assert.equal(documents.length, 0);

                    // now find one with no criteria given and ensure it gets added to _conditions
                    var query = ConversionEvent.find();
                    assert.deepEqual(query._conditions, {__t: 'model-discriminator-querying-conversion'});
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
      });

      var checkDiscriminatorModelsFindDocumentsOfItsType = function(fields, done) {
        var impressionEvent = new ImpressionEvent({name: 'Impression event'});
        var conversionEvent1 = new ConversionEvent({name: 'Conversion event 1', revenue: 1});
        var conversionEvent2 = new ConversionEvent({name: 'Conversion event 2', revenue: 2});

        impressionEvent.save(function(err) {
          assert.ifError(err);
          conversionEvent1.save(function(err) {
            assert.ifError(err);
            conversionEvent2.save(function(err) {
              assert.ifError(err);
              // doesn't find anything since we're querying for an impression id
              var query = ConversionEvent.find({_id: impressionEvent._id}, fields);
              assert.equal(query.op, 'find');
              assert.deepEqual(query._conditions, {_id: impressionEvent._id, __t: 'model-discriminator-querying-conversion'});
              query.exec(function(err, documents) {
                assert.ifError(err);
                assert.equal(documents.length, 0);

                // now find one with no criteria given and ensure it gets added to _conditions
                var query = ConversionEvent.find({}, fields);
                assert.deepEqual(query._conditions, {__t: 'model-discriminator-querying-conversion'});
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
      };

      it('discriminator model only finds documents of its type when fields selection set as string inclusive', function(done) {
        checkDiscriminatorModelsFindDocumentsOfItsType('name', done);
      });

      it('discriminator model only finds documents of its type when fields selection set as string exclusive', function(done) {
        checkDiscriminatorModelsFindDocumentsOfItsType('-revenue', done);
      });

      it('discriminator model only finds documents of its type when fields selection set as empty string', function(done) {
        checkDiscriminatorModelsFindDocumentsOfItsType('', done);
      });

      it('discriminator model only finds documents of its type when fields selection set as object inclusive', function(done) {
        checkDiscriminatorModelsFindDocumentsOfItsType({name: 1}, done);
      });

      it('discriminator model only finds documents of its type when fields selection set as object exclusive', function(done) {
        checkDiscriminatorModelsFindDocumentsOfItsType({revenue: 0}, done);
      });

      it('discriminator model only finds documents of its type when fields selection set as empty object', function(done) {
        checkDiscriminatorModelsFindDocumentsOfItsType({}, done);
      });

      it('hydrates streams', function(done) {
        var baseEvent = new BaseEvent({name: 'Base event'});
        var impressionEvent = new ImpressionEvent({name: 'Impression event'});
        var conversionEvent = new ConversionEvent({name: 'Conversion event', revenue: 1.337});

        baseEvent.save(function(err) {
          assert.ifError(err);
          impressionEvent.save(function(err) {
            assert.ifError(err);
            conversionEvent.save(function(err) {
              assert.ifError(err);
              var stream = BaseEvent.find({}).sort('name').stream();

              stream.on('data', function(doc) {
                switch (doc.name) {
                  case 'Base event':
                    assert.ok(doc instanceof BaseEvent);
                    break;
                  case 'Impression event':
                    assert.ok(doc instanceof BaseEvent);
                    assert.ok(doc instanceof ImpressionEvent);
                    break;
                  case 'Conversion event':
                    assert.ok(doc instanceof BaseEvent);
                    assert.ok(doc instanceof ConversionEvent);
                    break;
                  default:

                }
              });

              stream.on('error', function(err) {
                assert.ifError(err);
              });

              stream.on('close', function() {
                done();
              });
            });
          });
        });
      });
    });

    describe('findOne', function() {
      it('when selecting `select: false` field (gh-4629)', function(done) {
        var s = new SecretEvent({ name: 'test', secret: 'test2' });
        s.save(function(error) {
          assert.ifError(error);
          SecretEvent.findById(s._id, '+secret', function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.name, 'test');
            assert.equal(doc.secret, 'test2');
            done();
          });
        });
      });

      it('select: false in base schema (gh-5448)', function(done) {
        var schema = new mongoose.Schema({
          foo: String,
          hiddenColumn: {
            type: String,
            select: false
          }
        });

        var Foo = db.model('Foo', schema);
        var Bar = Foo.discriminator('Bar', new mongoose.Schema({
          bar: String
        }));

        var obj = {
          foo: 'test',
          hiddenColumn: 'Wanna see me?',
          bar: 'test2'
        };
        Bar.create(obj).
          then(function() { return Foo.find().select('+hiddenColumn'); }).
          then(function(docs) {
            assert.equal(docs.length, 1);
            assert.equal(docs[0].hiddenColumn, 'Wanna see me?');
            assert.equal(docs[0].foo, 'test');
            assert.equal(docs[0].bar, 'test2');
            done();
          }).
          catch(done);
      });

      it('hydrates correct model', function(done) {
        var baseEvent = new BaseEvent({name: 'Base event'});
        var impressionEvent = new ImpressionEvent({name: 'Impression event'});
        var conversionEvent = new ConversionEvent({name: 'Conversion event', revenue: 1.337});

        baseEvent.save(function(err) {
          assert.ifError(err);
          impressionEvent.save(function(err) {
            assert.ifError(err);
            conversionEvent.save(function(err) {
              assert.ifError(err);
              // finds & hydrates BaseEvent
              BaseEvent.findOne({_id: baseEvent._id}, function(err, event) {
                assert.ifError(err);
                assert.ok(event instanceof BaseEvent);
                assert.equal(event.name, 'Base event');

                // finds & hydrates ImpressionEvent
                BaseEvent.findOne({_id: impressionEvent._id}, function(err, event) {
                  assert.ifError(err);
                  assert.ok(event instanceof ImpressionEvent);
                  assert.equal(event.schema, ImpressionEventSchema);
                  assert.equal(event.name, 'Impression event');

                  // finds & hydrates ConversionEvent
                  BaseEvent.findOne({_id: conversionEvent._id}, function(err, event) {
                    assert.ifError(err);
                    assert.ok(event instanceof ConversionEvent);
                    assert.equal(event.schema, ConversionEventSchema);
                    assert.equal(event.name, 'Conversion event');
                    done();
                  });
                });
              });
            });
          });
        });
      });

      var checkHydratesCorrectModels = function(fields, done, checkUndefinedRevenue) {
        var baseEvent = new BaseEvent({name: 'Base event'});
        var impressionEvent = new ImpressionEvent({name: 'Impression event'});
        var conversionEvent = new ConversionEvent({name: 'Conversion event', revenue: 1.337});

        baseEvent.save(function(err) {
          assert.ifError(err);
          impressionEvent.save(function(err) {
            assert.ifError(err);
            conversionEvent.save(function(err) {
              assert.ifError(err);
              // finds & hydrates BaseEvent
              BaseEvent.findOne({_id: baseEvent._id}, fields, function(err, event) {
                assert.ifError(err);
                assert.ok(event instanceof BaseEvent);
                assert.equal(event.name, 'Base event');

                // finds & hydrates ImpressionEvent
                BaseEvent.findOne({_id: impressionEvent._id}, fields, function(err, event) {
                  assert.ifError(err);
                  assert.ok(event instanceof ImpressionEvent);
                  assert.equal(event.schema, ImpressionEventSchema);
                  assert.equal(event.name, 'Impression event');

                  // finds & hydrates ConversionEvent
                  BaseEvent.findOne({_id: conversionEvent._id}, fields, function(err, event) {
                    assert.ifError(err);
                    assert.ok(event instanceof ConversionEvent);
                    assert.equal(event.schema, ConversionEventSchema);
                    assert.equal(event.name, 'Conversion event');
                    if (checkUndefinedRevenue === true) {
                      assert.equal(event.revenue, undefined);
                    }
                    done();
                  });
                });
              });
            });
          });
        });
      };

      it('hydrates correct model when fields selection set as string inclusive', function(done) {
        checkHydratesCorrectModels('name', done, true);
      });

      it('hydrates correct model when fields selection set as string exclusive', function(done) {
        checkHydratesCorrectModels('-revenue', done, true);
      });

      it('hydrates correct model when fields selection set as empty string', function(done) {
        checkHydratesCorrectModels('', done);
      });

      it('hydrates correct model when fields selection set as object inclusive', function(done) {
        checkHydratesCorrectModels({name: 1}, done, true);
      });

      it('hydrates correct model when fields selection set as object exclusive', function(done) {
        checkHydratesCorrectModels({revenue: 0}, done, true);
      });

      it('hydrates correct model when fields selection set as empty object', function(done) {
        checkHydratesCorrectModels({}, done);
      });

      it('discriminator model only finds a document of its type', function(done) {
        var impressionEvent = new ImpressionEvent({name: 'Impression event'});
        var conversionEvent = new ConversionEvent({name: 'Conversion event', revenue: 2});

        impressionEvent.save(function(err) {
          assert.ifError(err);
          conversionEvent.save(function(err) {
            assert.ifError(err);
            // doesn't find anything since we're querying for an impression id
            var query = ConversionEvent.findOne({_id: impressionEvent._id});
            assert.equal(query.op, 'findOne');
            assert.deepEqual(query._conditions, {_id: impressionEvent._id, __t: 'model-discriminator-querying-conversion'});

            query.exec(function(err, document) {
              assert.ifError(err);
              assert.equal(document, null);

              // now find one with no criteria given and ensure it gets added to _conditions
              var query = ConversionEvent.findOne();
              assert.equal(query.op, 'findOne');
              assert.deepEqual(query._conditions, {__t: 'model-discriminator-querying-conversion'});

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

      var checkDiscriminatorModelsFindOneDocumentOfItsType = function(fields, done) {
        var impressionEvent = new ImpressionEvent({name: 'Impression event'});
        var conversionEvent = new ConversionEvent({name: 'Conversion event', revenue: 2});

        impressionEvent.save(function(err) {
          assert.ifError(err);
          conversionEvent.save(function(err) {
            assert.ifError(err);
            // doesn't find anything since we're querying for an impression id
            var query = ConversionEvent.findOne({_id: impressionEvent._id}, fields);
            assert.equal(query.op, 'findOne');
            assert.deepEqual(query._conditions, {_id: impressionEvent._id, __t: 'model-discriminator-querying-conversion'});

            query.exec(function(err, document) {
              assert.ifError(err);
              assert.equal(document, null);

              // now find one with no criteria given and ensure it gets added to _conditions
              var query = ConversionEvent.findOne({}, fields);
              assert.equal(query.op, 'findOne');
              assert.deepEqual(query._conditions, {__t: 'model-discriminator-querying-conversion'});

              query.exec(function(err, document) {
                assert.ifError(err);
                assert.ok(document instanceof ConversionEvent);
                assert.equal(document.__t, 'model-discriminator-querying-conversion');
                done();
              });
            });
          });
        });
      };

      it('discriminator model only finds a document of its type when fields selection set as string inclusive', function(done) {
        checkDiscriminatorModelsFindOneDocumentOfItsType('name', done);
      });

      it('discriminator model only finds a document of its type when fields selection set as string exclusive', function(done) {
        checkDiscriminatorModelsFindOneDocumentOfItsType('-revenue', done);
      });

      it('discriminator model only finds a document of its type when fields selection set as empty string', function(done) {
        checkDiscriminatorModelsFindOneDocumentOfItsType('', done);
      });

      it('discriminator model only finds a document of its type when fields selection set as object inclusive', function(done) {
        checkDiscriminatorModelsFindOneDocumentOfItsType({name: 1}, done);
      });

      it('discriminator model only finds a document of its type when fields selection set as object exclusive', function(done) {
        checkDiscriminatorModelsFindOneDocumentOfItsType({revenue: 0}, done);
      });

      it('discriminator model only finds a document of its type when fields selection set as empty object', function(done) {
        checkDiscriminatorModelsFindOneDocumentOfItsType({}, done);
      });
    });

    describe('findOneAndUpdate', function() {
      it('does not update models of other types', function(done) {
        var baseEvent = new BaseEvent({name: 'Base event'});
        var impressionEvent = new ImpressionEvent({name: 'Impression event'});
        var conversionEvent = new ConversionEvent({name: 'Conversion event', revenue: 1.337});

        baseEvent.save(function(err) {
          assert.ifError(err);
          impressionEvent.save(function(err) {
            assert.ifError(err);
            conversionEvent.save(function(err) {
              assert.ifError(err);
              var query = ConversionEvent.findOneAndUpdate({name: 'Impression event'}, {$set: {name: 'Impression event - updated'}});
              assert.deepEqual(query._conditions, {name: 'Impression event', __t: 'model-discriminator-querying-conversion'});
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
        var baseEvent = new BaseEvent({name: 'Base event'});
        var impressionEvent = new ImpressionEvent({name: 'Impression event'});
        var conversionEvent = new ConversionEvent({name: 'Conversion event', revenue: 1.337});

        baseEvent.save(function(err) {
          assert.ifError(err);
          impressionEvent.save(function(err) {
            assert.ifError(err);
            conversionEvent.save(function(err) {
              assert.ifError(err);
              var query = ConversionEvent.findOneAndUpdate({name: 'Conversion event'}, {$set: {name: 'Conversion event - updated'}}, {new: true});
              assert.deepEqual(query._conditions, {name: 'Conversion event', __t: 'model-discriminator-querying-conversion'});
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
        var baseEvent = new BaseEvent({name: 'Base event'});
        var impressionEvent = new ImpressionEvent({name: 'Impression event'});
        var conversionEvent = new ConversionEvent({name: 'Conversion event', revenue: 1.337});

        baseEvent.save(function(err) {
          assert.ifError(err);
          impressionEvent.save(function(err) {
            assert.ifError(err);
            conversionEvent.save(function(err) {
              assert.ifError(err);
              var query = BaseEvent.findOneAndUpdate({name: 'Conversion event'}, {$set: {name: 'Conversion event - updated'}}, {new: true});
              assert.deepEqual(query._conditions, {name: 'Conversion event'});
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

    describe('population/reference mapping', function() {
      it('populates and hydrates correct models', function(done) {
        var vehicleSchema = new Schema();
        var carSchema = new Schema({speed: Number});
        var busSchema = new Schema({speed: Number});

        var userSchema = new Schema({
          vehicles: [{type: Schema.Types.ObjectId, ref: 'ModelDiscriminatorPopulationVehicle'}],
          favoriteVehicle: {type: Schema.Types.ObjectId, ref: 'ModelDiscriminatorPopulationVehicle'},
          favoriteBus: {type: Schema.Types.ObjectId, ref: 'ModelDiscriminatorPopulationBus'}
        });

        var Vehicle = db.model('ModelDiscriminatorPopulationVehicle', vehicleSchema),
            Car = Vehicle.discriminator('ModelDiscriminatorPopulationCar', carSchema),
            Bus = Vehicle.discriminator('ModelDiscriminatorPopulationBus', busSchema),
            User = db.model('ModelDiscriminatorPopulationUser', userSchema);

        Vehicle.create({}, function(err, vehicle) {
          assert.ifError(err);
          Car.create({speed: 160}, function(err, car) {
            Bus.create({speed: 80}, function(err, bus) {
              assert.ifError(err);
              User.create({vehicles: [vehicle._id, car._id, bus._id], favoriteVehicle: car._id, favoriteBus: bus._id}, function(err) {
                assert.ifError(err);
                User.findOne({}).populate('vehicles favoriteVehicle favoriteBus').exec(function(err, user) {
                  assert.ifError(err);

                  var expected = {
                    __v: 0,
                    _id: user._id,
                    vehicles: [
                      {_id: vehicle._id, __v: 0},
                      {_id: car._id, speed: 160, __v: 0, __t: 'ModelDiscriminatorPopulationCar'},
                      {_id: bus._id, speed: 80, __v: 0, __t: 'ModelDiscriminatorPopulationBus'}
                    ],
                    favoriteVehicle: {_id: car._id, speed: 160, __v: 0, __t: 'ModelDiscriminatorPopulationCar'},
                    favoriteBus: {_id: bus._id, speed: 80, __v: 0, __t: 'ModelDiscriminatorPopulationBus'}
                  };

                  assert.deepEqual(user.toJSON(), expected);
                  assert.ok(user.vehicles[0] instanceof Vehicle);
                  assert.ok(!(user.vehicles[0] instanceof Car));
                  assert.ok(!(user.vehicles[0] instanceof Bus));

                  assert.ok(user.vehicles[1] instanceof Car);
                  assert.ok(!(user.vehicles[1] instanceof Bus));

                  assert.ok(user.vehicles[2] instanceof Bus);
                  assert.ok(!(user.vehicles[2] instanceof Car));

                  assert.ok(user.favoriteVehicle instanceof Car);
                  assert.ok(user.favoriteBus instanceof Bus);
                  done();
                });
              });
            });
          });
        });
      });

      it('reference in child schemas (gh-2719)', function(done) {
        var vehicleSchema = new Schema({});
        var carSchema = new Schema({
          speed: Number,
          garage: {type: Schema.Types.ObjectId, ref: 'gh2719PopulationGarage'}
        });
        var busSchema = new Schema({
          speed: Number,
          garage: {type: Schema.Types.ObjectId, ref: 'gh2719PopulationGarage'}
        });

        var garageSchema = new Schema({
          name: String,
          num_of_places: Number
        });

        var Vehicle = db.model('gh2719PopulationVehicle', vehicleSchema),
            Car = Vehicle.discriminator('gh2719PopulationCar', carSchema),
            Bus = Vehicle.discriminator('gh2719PopulationBus', busSchema),
            Garage = db.model('gh2719PopulationGarage', garageSchema);

        Garage.create({name: 'My', num_of_places: 3}, function(err, garage) {
          assert.ifError(err);
          Car.create({speed: 160, garage: garage}, function(err) {
            assert.ifError(err);
            Bus.create({speed: 80, garage: garage}, function(err) {
              assert.ifError(err);
              Vehicle.find({}).populate('garage').exec(function(err, vehicles) {
                assert.ifError(err);

                vehicles.forEach(function(v) {
                  assert.ok(v.garage instanceof Garage);
                });

                done();
              });
            });
          });
        });
      });

      it('populates parent array reference (gh-4643)', function(done) {
        var vehicleSchema = new Schema({
          wheels: [{
            type: Schema.Types.ObjectId,
            ref: 'gh4643'
          }]
        });
        var wheelSchema = new Schema({ brand: String });
        var busSchema = new Schema({ speed: Number });

        var Vehicle = db.model('gh4643_0', vehicleSchema);
        var Bus = Vehicle.discriminator('gh4643_00', busSchema);
        var Wheel = db.model('gh4643', wheelSchema);

        Wheel.create({ brand: 'Rotiform' }, function(err, wheel) {
          assert.ifError(err);
          Bus.create({ speed: 80, wheels: [wheel] }, function(err) {
            assert.ifError(err);
            Bus.findOne({}).populate('wheels').exec(function(err, bus) {
              assert.ifError(err);

              assert.ok(bus instanceof Vehicle);
              assert.ok(bus instanceof Bus);
              assert.equal(bus.wheels.length, 1);
              assert.ok(bus.wheels[0] instanceof Wheel);
              assert.equal(bus.wheels[0].brand, 'Rotiform');
              done();
            });
          });
        });
      });

      it('updating type key (gh-5613)', function(done) {
        function BaseSchema() {
          Schema.apply(this, arguments);

          this.add({
            name: {type: String, required: true}
          });
        }

        util.inherits(BaseSchema, Schema);

        var orgSchema = new BaseSchema({});
        var schoolSchema = new BaseSchema({ principal: String });

        var Org = db.model('gh5613', orgSchema);
        Org.discriminator('gh5613_0', schoolSchema);

        Org.create({ name: 'test' }, function(error, doc) {
          assert.ifError(error);
          assert.ok(!doc.__t);
          Org.findByIdAndUpdate(doc._id, { __t: 'gh5613_0' }, { new: true }, function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.__t, 'gh5613_0');
            done();
          });
        });
      });

      it('reference in child schemas (gh-2719-2)', function(done) {
        var EventSchema, Event, TalkSchema, Talk, Survey;

        function BaseSchema() {
          Schema.apply(this, arguments);

          this.add({
            name: {type: String, required: true},
            date: {type: Date, required: true},
            period: {start: {type: String, required: true},
              end: {type: String, required: true}
            }
          });
        }

        util.inherits(BaseSchema, Schema);

        EventSchema = new BaseSchema({});
        Event = db.model('Event', EventSchema);

        TalkSchema = new BaseSchema({
          pin: {type: String, required: true, index: {unique: true}},
          totalAttendees: {type: Number},
          speakers: [{type: Schema.Types.ObjectId, ref: 'Speaker'}],
          surveys: [{type: Schema.Types.ObjectId, ref: 'Survey'}],
          questions: [{type: Schema.Types.ObjectId, ref: 'Question'}]
        });

        Talk = Event.discriminator('Talk', TalkSchema);

        Survey = db.model('Survey', Schema({
          name: String,
          date: Date
        }));

        Survey.create({
          name: 'That you see?',
          date: Date.now()
        }, function(err, survey) {
          assert.ifError(err);

          Talk.create({
            name: 'Meetup rails',
            date: new Date('2015-04-01T00:00:00Z'),
            pin: '0004',
            period: {start: '11:00', end: '12:00'},
            surveys: [survey]
          }, function(err) {
            assert.ifError(err);

            Event.find({}).populate('surveys').exec(function(err, events) {
              assert.ifError(err);

              assert.ok(events[0].surveys[0] instanceof Survey);

              done();
            });
          });
        });
      });
    });

    describe('aggregate', function() {
      var impressionEvent, conversionEvent, ignoredImpressionEvent;

      beforeEach(function(done) {
        impressionEvent = new ImpressionEvent({name: 'Test Event'});
        conversionEvent = new ConversionEvent({name: 'Test Event', revenue: 10});
        ignoredImpressionEvent = new ImpressionEvent({name: 'Ignored Event'});

        async.forEach(
          [impressionEvent, conversionEvent, ignoredImpressionEvent],
          function(doc, cb) {
            doc.save(cb);
          },
          done
        );
      });

      describe('using "RootModel#aggregate"', function() {
        it('to aggregate documents of all discriminators', function(done) {
          var aggregate = BaseEvent.aggregate([
            {$match: {name: 'Test Event'}}
          ]);

          aggregate.exec(function(err, docs) {
            assert.ifError(err);
            assert.deepEqual(aggregate._pipeline, [
              {$match: {name: 'Test Event'}}
            ]);
            assert.equal(docs.length, 2);
            done();
          });
        });
      });

      describe('using "ModelDiscriminator#aggregate"', function() {
        it('only aggregates documents of the appropriate discriminator', function(done) {
          var aggregate = ImpressionEvent.aggregate([
            {$group: {_id: '$__t', count: {$sum: 1}}}
          ]);

          aggregate.exec(function(err, result) {
            assert.ifError(err);

            // Discriminator `$match` pipeline step was added on the
            // `exec` step. The reasoning for this is to not let
            // aggregations with empty pipelines, but that are over
            // discriminators be executed
            assert.deepEqual(aggregate._pipeline, [
              {$match: {__t: 'model-discriminator-querying-impression'}},
              {$group: {_id: '$__t', count: {$sum: 1}}}
            ]);

            assert.equal(result.length, 1);
            assert.deepEqual(result, [
              {_id: 'model-discriminator-querying-impression', count: 2}
            ]);
            done();
          });
        });

        it('hides fields when discriminated model has select (gh-4991)', function(done) {
          var baseSchema = new mongoose.Schema({
            internal: {
              test: [{ type: String }]
            }
          });

          var Base = db.model('gh4991', baseSchema);
          var discriminatorSchema = new mongoose.Schema({
            internal: {
              password: { type: String, select: false }
            }
          });
          var Discriminator = Base.discriminator('gh4991_0',
            discriminatorSchema);

          var obj = {
            internal: {
              test: ['abc'],
              password: 'password'
            }
          };
          Discriminator.create(obj).
            then(function(doc) { return Base.findById(doc._id); }).
            then(function(doc) {
              assert.ok(!doc.internal.password);
              done();
            }).
            catch(done);
        });

        it('merges the first pipeline stages if applicable', function(done) {
          var aggregate = ImpressionEvent.aggregate([
            {$match: {name: 'Test Event'}}
          ]);

          aggregate.exec(function(err, result) {
            assert.ifError(err);

            // Discriminator `$match` pipeline step was added on the
            // `exec` step. The reasoning for this is to not let
            // aggregations with empty pipelines, but that are over
            // discriminators be executed
            assert.deepEqual(aggregate._pipeline, [
              {$match: {__t: 'model-discriminator-querying-impression', name: 'Test Event'}}
            ]);

            assert.equal(result.length, 1);
            assert.equal(result[0]._id, impressionEvent.id);
            done();
          });
        });
      });
    });
  });
});
