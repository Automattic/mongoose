/**
 * Test dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');
const co = require('co');
const util = require('util');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

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

const EventSchema = new BaseSchema();
const ImpressionEventSchema = new BaseSchema({ element: String });
const ConversionEventSchema = new BaseSchema({ revenue: Number });
const SecretEventSchema = new BaseSchema({ secret: { type: String, select: false } });

describe('model', function() {
  describe('discriminator()', function() {
    let db;
    let BaseEvent;
    let ImpressionEvent;
    let ConversionEvent;
    let SecretEvent;

    before(function() {
      db = start();
    });

    beforeEach(() => db.deleteModel(/.*/));
    beforeEach(() => {
      BaseEvent = db.model('Event', EventSchema);
      ImpressionEvent = BaseEvent.discriminator('Impression', ImpressionEventSchema);
      ConversionEvent = BaseEvent.discriminator('Conversion', ConversionEventSchema);
      SecretEvent = BaseEvent.discriminator('Secret', SecretEventSchema);
    });

    afterEach(() => require('./util').clearTestData(db));
    afterEach(() => require('./util').stopRemainingOps(db));

    after(function(done) {
      db.close(done);
    });

    describe('pushing discriminated objects', function() {
      let ContainerModel, BaseCustomEvent, DiscCustomEvent;
      beforeEach(function() {
        const BaseCustomEventSchema = new BaseSchema();
        const DiscCustomEventSchema = new BaseSchema({
          personName: Number
        });
        BaseCustomEvent = db.model('Test',
          BaseCustomEventSchema);
        DiscCustomEvent = BaseCustomEvent.discriminator('D',
          DiscCustomEventSchema);
        const ContainerSchema = new Schema({
          title: String,
          events: [{ type: Schema.Types.ObjectId, ref: 'Test' }]
        });
        ContainerModel = db.model('Test1', ContainerSchema);
      });

      it('into non-discriminated arrays works', function() {
        const c = new ContainerModel({
          title: 'events-group-1'
        });
        const d1 = new BaseCustomEvent();
        const d2 = new BaseCustomEvent();
        const d3 = new DiscCustomEvent();
        c.events.push(d1);
        c.events.push(d2);

        return d1.save().
          then(() => d2.save()).
          then(() => d3.save()).
          then(() => c.save()).
          then(() => ContainerModel.findOne({}).populate('events')).
          then(doc => {
            assert.ok(doc.events && doc.events.length);
            assert.equal(doc.events.length, 2);
            doc.events.push(d3);
            let hasDisc = false;
            const discKey = DiscCustomEvent.schema.discriminatorMapping.key;
            doc.events.forEach(function(subDoc) {
              if (discKey in subDoc) {
                hasDisc = true;
              }
            });
            assert.ok(hasDisc);
          });
      });
    });

    describe('find', function() {
      it('hydrates correct models', function(done) {
        const baseEvent = new BaseEvent({ name: 'Base event' });
        const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        const conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 1.337 });

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
                assert.deepEqual(docs[1].schema.tree, ConversionEventSchema.tree);
                assert.equal(docs[1].name, 'Conversion event');
                assert.equal(docs[1].revenue, 1.337);

                assert.ok(docs[2] instanceof ImpressionEvent);
                assert.deepEqual(docs[2].schema.tree, ImpressionEventSchema.tree);
                assert.equal(docs[2].name, 'Impression event');
                done();
              });
            });
          });
        });
      });

      const checkHydratesCorrectModels = function(fields, done) {
        const baseEvent = new BaseEvent({ name: 'Base event' });
        const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        const conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 1.337 });

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
                assert.deepEqual(docs[1].schema.tree, ConversionEventSchema.tree);
                assert.equal(docs[1].name, 'Conversion event');
                assert.equal(docs[1].revenue, undefined);

                assert.ok(docs[2] instanceof ImpressionEvent);
                assert.deepEqual(docs[2].schema.tree, ImpressionEventSchema.tree);
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
        checkHydratesCorrectModels({ name: 1 }, done);
      });

      it('casts underneath $or if discriminator key in filter (gh-9018)', function() {
        return co(function*() {
          yield ImpressionEvent.create({ name: 'Impression event', element: '42' });
          yield ConversionEvent.create({ name: 'Conversion event', revenue: 1.337 });

          let docs = yield BaseEvent.find({ __t: 'Impression', element: 42 });
          assert.equal(docs.length, 1);
          assert.equal(docs[0].name, 'Impression event');

          docs = yield BaseEvent.find({ $or: [{ __t: 'Impression', element: 42 }] });
          assert.equal(docs.length, 1);
          assert.equal(docs[0].name, 'Impression event');

          docs = yield BaseEvent.find({
            $or: [{ __t: 'Impression', element: 42 }, { __t: 'Conversion', revenue: '1.337' }]
          }).sort({ __t: 1 });
          assert.equal(docs.length, 2);
          assert.equal(docs[0].name, 'Conversion event');
          assert.equal(docs[1].name, 'Impression event');
        });
      });

      describe('discriminator model only finds documents of its type', function() {

        describe('using "ModelDiscriminator#findById"', function() {
          it('to find a document of the appropriate discriminator', function(done) {
            const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
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
            const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
            const conversionEvent1 = new ConversionEvent({ name: 'Conversion event 1', revenue: 1 });
            const conversionEvent2 = new ConversionEvent({ name: 'Conversion event 2', revenue: 2 });
            impressionEvent.save(function(err) {
              assert.ifError(err);
              conversionEvent1.save(function(err) {
                assert.ifError(err);
                conversionEvent2.save(function(err) {
                  assert.ifError(err);
                  // doesn't find anything since we're querying for an impression id
                  const query = ConversionEvent.find({ _id: impressionEvent._id });
                  assert.equal(query.op, 'find');
                  assert.deepEqual(query._conditions, { _id: impressionEvent._id, __t: 'Conversion' });
                  query.exec(function(err, documents) {
                    assert.ifError(err);
                    assert.equal(documents.length, 0);

                    // now find one with no criteria given and ensure it gets added to _conditions
                    const query = ConversionEvent.find();
                    assert.deepEqual(query._conditions, { __t: 'Conversion' });
                    assert.equal(query.op, 'find');
                    query.exec(function(err, documents) {
                      assert.ifError(err);
                      assert.equal(documents.length, 2);

                      assert.ok(documents[0] instanceof ConversionEvent);
                      assert.equal(documents[0].__t, 'Conversion');

                      assert.ok(documents[1] instanceof ConversionEvent);
                      assert.equal(documents[1].__t, 'Conversion');

                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });

      const checkDiscriminatorModelsFindDocumentsOfItsType = function(fields, done) {
        const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        const conversionEvent1 = new ConversionEvent({ name: 'Conversion event 1', revenue: 1 });
        const conversionEvent2 = new ConversionEvent({ name: 'Conversion event 2', revenue: 2 });

        impressionEvent.save(function(err) {
          assert.ifError(err);
          conversionEvent1.save(function(err) {
            assert.ifError(err);
            conversionEvent2.save(function(err) {
              assert.ifError(err);
              // doesn't find anything since we're querying for an impression id
              const query = ConversionEvent.find({ _id: impressionEvent._id }, fields);
              assert.equal(query.op, 'find');
              assert.deepEqual(query._conditions, { _id: impressionEvent._id, __t: 'Conversion' });
              query.exec(function(err, documents) {
                assert.ifError(err);
                assert.equal(documents.length, 0);

                // now find one with no criteria given and ensure it gets added to _conditions
                const query = ConversionEvent.find({}, fields);
                assert.deepEqual(query._conditions, { __t: 'Conversion' });
                assert.equal(query.op, 'find');
                query.exec(function(err, documents) {
                  assert.ifError(err);
                  assert.equal(documents.length, 2);

                  assert.ok(documents[0] instanceof ConversionEvent);
                  assert.equal(documents[0].__t, 'Conversion');

                  assert.ok(documents[1] instanceof ConversionEvent);
                  assert.equal(documents[1].__t, 'Conversion');
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
        checkDiscriminatorModelsFindDocumentsOfItsType({ name: 1 }, done);
      });

      it('discriminator model only finds documents of its type when fields selection set as object exclusive', function(done) {
        checkDiscriminatorModelsFindDocumentsOfItsType({ revenue: 0 }, done);
      });

      it('discriminator model only finds documents of its type when fields selection set as empty object', function(done) {
        checkDiscriminatorModelsFindDocumentsOfItsType({}, done);
      });
    });

    describe('findOne', function() {
      it('when selecting `select: false` field (gh-4629)', function(done) {
        const s = new SecretEvent({ name: 'test', secret: 'test2' });
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
        const schema = new mongoose.Schema({
          foo: String,
          hiddenColumn: {
            type: String,
            select: false
          }
        });

        const Foo = db.model('Test', schema);
        const Bar = Foo.discriminator('TestDiscriminator', new mongoose.Schema({
          bar: String
        }));

        const obj = {
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
        const baseEvent = new BaseEvent({ name: 'Base event' });
        const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        const conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 1.337 });

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
                assert.equal(event.name, 'Base event');

                // finds & hydrates ImpressionEvent
                BaseEvent.findOne({ _id: impressionEvent._id }, function(err, event) {
                  assert.ifError(err);
                  assert.ok(event instanceof ImpressionEvent);
                  assert.deepEqual(event.schema.tree, ImpressionEventSchema.tree);
                  assert.equal(event.name, 'Impression event');

                  // finds & hydrates ConversionEvent
                  BaseEvent.findOne({ _id: conversionEvent._id }, function(err, event) {
                    assert.ifError(err);
                    assert.ok(event instanceof ConversionEvent);
                    assert.deepEqual(event.schema.tree, ConversionEventSchema.tree);
                    assert.equal(event.name, 'Conversion event');
                    done();
                  });
                });
              });
            });
          });
        });
      });

      const checkHydratesCorrectModels = function(fields, done, checkUndefinedRevenue) {
        const baseEvent = new BaseEvent({ name: 'Base event' });
        const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        const conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 1.337 });

        baseEvent.save(function(err) {
          assert.ifError(err);
          impressionEvent.save(function(err) {
            assert.ifError(err);
            conversionEvent.save(function(err) {
              assert.ifError(err);
              // finds & hydrates BaseEvent
              BaseEvent.findOne({ _id: baseEvent._id }, fields, function(err, event) {
                assert.ifError(err);
                assert.ok(event instanceof BaseEvent);
                assert.equal(event.name, 'Base event');

                // finds & hydrates ImpressionEvent
                BaseEvent.findOne({ _id: impressionEvent._id }, fields, function(err, event) {
                  assert.ifError(err);
                  assert.ok(event instanceof ImpressionEvent);
                  assert.deepEqual(event.schema.tree, ImpressionEventSchema.tree);
                  assert.equal(event.name, 'Impression event');

                  // finds & hydrates ConversionEvent
                  BaseEvent.findOne({ _id: conversionEvent._id }, fields, function(err, event) {
                    assert.ifError(err);
                    assert.ok(event instanceof ConversionEvent);
                    assert.deepEqual(event.schema.tree, ConversionEventSchema.tree);
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
        checkHydratesCorrectModels({ name: 1 }, done, true);
      });

      it('hydrates correct model when fields selection set as object exclusive', function(done) {
        checkHydratesCorrectModels({ revenue: 0 }, done, true);
      });

      it('hydrates correct model when fields selection set as empty object', function(done) {
        checkHydratesCorrectModels({}, done);
      });

      it('discriminator model only finds a document of its type', function(done) {
        const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        const conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 2 });

        impressionEvent.save(function(err) {
          assert.ifError(err);
          conversionEvent.save(function(err) {
            assert.ifError(err);
            // doesn't find anything since we're querying for an impression id
            const query = ConversionEvent.findOne({ _id: impressionEvent._id });
            assert.equal(query.op, 'findOne');
            assert.deepEqual(query._conditions, { _id: impressionEvent._id, __t: 'Conversion' });

            query.exec(function(err, document) {
              assert.ifError(err);
              assert.equal(document, null);

              // now find one with no criteria given and ensure it gets added to _conditions
              const query = ConversionEvent.findOne();
              assert.equal(query.op, 'findOne');
              assert.deepEqual(query._conditions, { __t: 'Conversion' });

              query.exec(function(err, document) {
                assert.ifError(err);
                assert.ok(document instanceof ConversionEvent);
                assert.equal(document.__t, 'Conversion');
                done();
              });
            });
          });
        });
      });

      const checkDiscriminatorModelsFindOneDocumentOfItsType = function(fields, done) {
        const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        const conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 2 });

        impressionEvent.save(function(err) {
          assert.ifError(err);
          conversionEvent.save(function(err) {
            assert.ifError(err);
            // doesn't find anything since we're querying for an impression id
            const query = ConversionEvent.findOne({ _id: impressionEvent._id }, fields);
            assert.equal(query.op, 'findOne');
            assert.deepEqual(query._conditions, { _id: impressionEvent._id, __t: 'Conversion' });

            query.exec(function(err, document) {
              assert.ifError(err);
              assert.equal(document, null);

              // now find one with no criteria given and ensure it gets added to _conditions
              const query = ConversionEvent.findOne({}, fields);
              assert.equal(query.op, 'findOne');
              assert.deepEqual(query._conditions, { __t: 'Conversion' });

              query.exec(function(err, document) {
                assert.ifError(err);
                assert.ok(document instanceof ConversionEvent);
                assert.equal(document.__t, 'Conversion');
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
        checkDiscriminatorModelsFindOneDocumentOfItsType({ name: 1 }, done);
      });

      it('discriminator model only finds a document of its type when fields selection set as object exclusive', function(done) {
        checkDiscriminatorModelsFindOneDocumentOfItsType({ revenue: 0 }, done);
      });

      it('discriminator model only finds a document of its type when fields selection set as empty object', function(done) {
        checkDiscriminatorModelsFindOneDocumentOfItsType({}, done);
      });
    });

    describe('findOneAndUpdate', function() {
      it('does not update models of other types', function(done) {
        const baseEvent = new BaseEvent({ name: 'Base event' });
        const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        const conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 1.337 });

        baseEvent.save(function(err) {
          assert.ifError(err);
          impressionEvent.save(function(err) {
            assert.ifError(err);
            conversionEvent.save(function(err) {
              assert.ifError(err);
              const query = ConversionEvent.findOneAndUpdate({ name: 'Impression event' }, { $set: { name: 'Impression event - updated' } });
              assert.deepEqual(query._conditions, { name: 'Impression event', __t: 'Conversion' });
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
        const baseEvent = new BaseEvent({ name: 'Base event' });
        const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        const conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 1.337 });

        baseEvent.save(function(err) {
          assert.ifError(err);
          impressionEvent.save(function(err) {
            assert.ifError(err);
            conversionEvent.save(function(err) {
              assert.ifError(err);
              const query = ConversionEvent.findOneAndUpdate({ name: 'Conversion event' }, { $set: { name: 'Conversion event - updated' } }, { new: true });
              assert.deepEqual(query._conditions, { name: 'Conversion event', __t: 'Conversion' });
              query.exec(function(err, document) {
                assert.ifError(err);
                const expected = conversionEvent.toJSON();
                expected.name = 'Conversion event - updated';
                assert.deepEqual(document.toJSON(), expected);
                done();
              });
            });
          });
        });
      });

      it('base model modifies any event type', function(done) {
        const baseEvent = new BaseEvent({ name: 'Base event' });
        const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        const conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 1.337 });

        baseEvent.save(function(err) {
          assert.ifError(err);
          impressionEvent.save(function(err) {
            assert.ifError(err);
            conversionEvent.save(function(err) {
              assert.ifError(err);
              const query = BaseEvent.findOneAndUpdate({ name: 'Conversion event' }, { $set: { name: 'Conversion event - updated' } }, { new: true });
              assert.deepEqual(query._conditions, { name: 'Conversion event' });
              query.exec(function(err, document) {
                assert.ifError(err);
                const expected = conversionEvent.toJSON();
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
        const vehicleSchema = new Schema();
        const carSchema = new Schema({ speed: Number });
        const busSchema = new Schema({ speed: Number });

        const userSchema = new Schema({
          vehicles: [{ type: Schema.Types.ObjectId, ref: 'Vehicle' }],
          favoriteVehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
          favoriteBus: { type: Schema.Types.ObjectId, ref: 'Bus' }
        });

        const Vehicle = db.model('Vehicle', vehicleSchema);
        const Car = Vehicle.discriminator('Car', carSchema);
        const Bus = Vehicle.discriminator('Bus', busSchema);
        const User = db.model('User', userSchema);

        Vehicle.create({}, function(err, vehicle) {
          assert.ifError(err);
          Car.create({ speed: 160 }, function(err, car) {
            Bus.create({ speed: 80 }, function(err, bus) {
              assert.ifError(err);
              User.create({ vehicles: [vehicle._id, car._id, bus._id], favoriteVehicle: car._id, favoriteBus: bus._id }, function(err) {
                assert.ifError(err);
                User.findOne({}).populate('vehicles favoriteVehicle favoriteBus').exec(function(err, user) {
                  assert.ifError(err);

                  const expected = {
                    __v: 0,
                    _id: user._id,
                    vehicles: [
                      { _id: vehicle._id, __v: 0 },
                      { _id: car._id, speed: 160, __v: 0, __t: 'Car' },
                      { _id: bus._id, speed: 80, __v: 0, __t: 'Bus' }
                    ],
                    favoriteVehicle: { _id: car._id, speed: 160, __v: 0, __t: 'Car' },
                    favoriteBus: { _id: bus._id, speed: 80, __v: 0, __t: 'Bus' }
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
        const vehicleSchema = new Schema({});
        const carSchema = new Schema({
          speed: Number,
          garage: { type: Schema.Types.ObjectId, ref: 'Test' }
        });
        const busSchema = new Schema({
          speed: Number,
          garage: { type: Schema.Types.ObjectId, ref: 'Test' }
        });

        const garageSchema = new Schema({
          name: String,
          num_of_places: Number
        });

        const Vehicle = db.model('Vehicle', vehicleSchema);
        const Car = Vehicle.discriminator('Car', carSchema);
        const Bus = Vehicle.discriminator('Bus', busSchema);
        const Garage = db.model('Test', garageSchema);

        Garage.create({ name: 'My', num_of_places: 3 }, function(err, garage) {
          assert.ifError(err);
          Car.create({ speed: 160, garage: garage }, function(err) {
            assert.ifError(err);
            Bus.create({ speed: 80, garage: garage }, function(err) {
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
        const vehicleSchema = new Schema({
          wheels: [{
            type: Schema.Types.ObjectId,
            ref: 'Test'
          }]
        });
        const wheelSchema = new Schema({ brand: String });
        const busSchema = new Schema({ speed: Number });

        const Vehicle = db.model('Vehicle', vehicleSchema);
        const Bus = Vehicle.discriminator('Bus', busSchema);
        const Wheel = db.model('Test', wheelSchema);

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
            name: { type: String, required: true }
          });
        }

        util.inherits(BaseSchema, Schema);

        const orgSchema = new BaseSchema({});
        const schoolSchema = new BaseSchema({ principal: String });

        const Org = db.model('Test', orgSchema);
        Org.discriminator('D', schoolSchema);

        Org.create({ name: 'test' }, function(error, doc) {
          assert.ifError(error);
          assert.ok(!doc.__t);
          Org.findByIdAndUpdate(doc._id, { __t: 'D' }, { new: true }, function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.__t, 'D');
            done();
          });
        });
      });

      it('reference in child schemas (gh-2719-2)', function() {
        function BaseSchema() {
          Schema.apply(this, arguments);

          this.add({
            name: { type: String, required: true },
            date: { type: Date, required: true },
            period: { start: { type: String, required: true },
              end: { type: String, required: true }
            }
          });
        }

        util.inherits(BaseSchema, Schema);

        const EventSchema = new BaseSchema({});
        db.deleteModel(/Event/);
        const Event = db.model('Event', EventSchema);

        const TalkSchema = new BaseSchema({
          pin: { type: String, required: true, index: { unique: true } },
          totalAttendees: { type: Number },
          speakers: [{ type: Schema.Types.ObjectId, ref: 'Speaker' }],
          surveys: [{ type: Schema.Types.ObjectId, ref: 'Test' }],
          questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }]
        });

        const Talk = Event.discriminator('Talk', TalkSchema);

        const Survey = db.model('Test', Schema({
          name: String,
          date: Date
        }));

        return co(function*() {
          const survey = yield Survey.create({
            name: 'That you see?',
            date: Date.now()
          });

          yield Talk.create({
            name: 'Meetup rails',
            date: new Date('2015-04-01T00:00:00Z'),
            pin: '0004',
            period: { start: '11:00', end: '12:00' },
            surveys: [survey]
          });

          const events = yield Event.find({}).populate('surveys').exec();

          assert.ok(events[0].surveys[0] instanceof Survey);
        });
      });
    });

    describe('deleteOne and deleteMany (gh-8471)', function() {
      it('adds discriminator filter if no conditions passed', () => {
        const PeopleSchema = Schema({ job: String, name: String },
          { discriminatorKey: 'job' });

        const People = db.model('Person', PeopleSchema);

        const DesignerSchema = Schema({ badge: String });
        const Designer = People.discriminator('Designer', DesignerSchema, 'Designer');

        const DeveloperSchema = Schema({ coffeeAmount: Number });
        const Developer = People.discriminator('Developer', DeveloperSchema, 'Developer');

        return co(function*() {
          yield Designer.create({
            name: 'John',
            job: 'Designer',
            badge: 'green'
          });

          let numDesigners = yield Designer.countDocuments();
          let numDevelopers = yield Developer.countDocuments();
          let total = yield People.countDocuments();
          assert.equal(numDesigners, 1);
          assert.equal(numDevelopers, 0);
          assert.equal(total, 1);

          yield Developer.deleteOne();

          numDesigners = yield Designer.countDocuments();
          numDevelopers = yield Developer.countDocuments();
          total = yield People.countDocuments();
          assert.equal(numDesigners, 1);
          assert.equal(numDevelopers, 0);
          assert.equal(total, 1);

          yield Developer.create([
            { name: 'Mike', job: 'Developer', coffeeAmount: 25 },
            { name: 'Joe', job: 'Developer', coffeeAmount: 14 }
          ]);

          numDesigners = yield Designer.countDocuments();
          numDevelopers = yield Developer.countDocuments();
          total = yield People.countDocuments();
          assert.equal(numDesigners, 1);
          assert.equal(numDevelopers, 2);
          assert.equal(total, 3);

          yield Developer.deleteMany();

          numDesigners = yield Designer.countDocuments();
          numDevelopers = yield Developer.countDocuments();
          total = yield People.countDocuments();
          assert.equal(numDesigners, 1);
          assert.equal(numDevelopers, 0);
          assert.equal(total, 1);
        });
      });
    });

    describe('aggregate', function() {
      let impressionEvent, conversionEvent, ignoredImpressionEvent;

      beforeEach(function() {
        impressionEvent = new ImpressionEvent({ name: 'Test Event' });
        conversionEvent = new ConversionEvent({ name: 'Test Event', revenue: 10 });
        ignoredImpressionEvent = new ImpressionEvent({ name: 'Ignored Event' });

        return Promise.all([impressionEvent, conversionEvent, ignoredImpressionEvent].map(d => d.save()));
      });

      describe('using "RootModel#aggregate"', function() {
        it('to aggregate documents of all discriminators', function(done) {
          const aggregate = BaseEvent.aggregate([
            { $match: { name: 'Test Event' } }
          ]);

          aggregate.exec(function(err, docs) {
            assert.ifError(err);
            assert.deepEqual(aggregate._pipeline, [
              { $match: { name: 'Test Event' } }
            ]);
            assert.equal(docs.length, 2);
            done();
          });
        });
      });

      describe('using "ModelDiscriminator#aggregate"', function() {
        it('only aggregates documents of the appropriate discriminator', function(done) {
          const aggregate = ImpressionEvent.aggregate([
            { $group: { _id: '$__t', count: { $sum: 1 } } }
          ]);

          aggregate.exec(function(err, result) {
            assert.ifError(err);

            // Discriminator `$match` pipeline step was added on the
            // `exec` step. The reasoning for this is to not let
            // aggregations with empty pipelines, but that are over
            // discriminators be executed
            assert.deepEqual(aggregate._pipeline, [
              { $match: { __t: 'Impression' } },
              { $group: { _id: '$__t', count: { $sum: 1 } } }
            ]);

            assert.equal(result.length, 1);
            assert.deepEqual(result, [
              { _id: 'Impression', count: 2 }
            ]);
            done();
          });
        });

        it('hides fields when discriminated model has select (gh-4991)', function(done) {
          const baseSchema = new mongoose.Schema({
            internal: {
              test: [{ type: String }]
            }
          });

          const Base = db.model('Test', baseSchema);
          const discriminatorSchema = new mongoose.Schema({
            internal: {
              password: { type: String, select: false }
            }
          });
          const Discriminator = Base.discriminator('D',
            discriminatorSchema);

          const obj = {
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

        it('doesnt exclude field if slice (gh-4991)', function(done) {
          const baseSchema = new mongoose.Schema({
            propA: { type: String, default: 'default value' },
            array: [{ type: String }]
          });

          const Base = db.model('Test', baseSchema);
          const discriminatorSchema = new mongoose.Schema({
            propB: { type: String }
          });
          const Discriminator = Base.discriminator('D', discriminatorSchema);

          const obj = { propA: 'Hi', propB: 'test', array: ['a', 'b'] };
          Discriminator.create(obj, function(error) {
            assert.ifError(error);
            Base.find().slice('array', 1).exec(function(error, docs) {
              assert.equal(docs.length, 1);
              assert.equal(docs[0].propA, 'Hi');
              done();
            });
          });
        });

        it('merges the first pipeline stages if applicable', function(done) {
          const aggregate = ImpressionEvent.aggregate([
            { $match: { name: 'Test Event' } }
          ]);

          aggregate.exec(function(err, result) {
            assert.ifError(err);

            // Discriminator `$match` pipeline step was added on the
            // `exec` step. The reasoning for this is to not let
            // aggregations with empty pipelines, but that are over
            // discriminators be executed
            assert.deepEqual(aggregate._pipeline, [
              { $match: { __t: 'Impression', name: 'Test Event' } }
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
