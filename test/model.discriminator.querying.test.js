/**
 * Test dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');
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

    after(async function() {
      await db.close();
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
      it('hydrates correct models', async function() {
        const baseEvent = new BaseEvent({ name: 'Base event' });
        const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        const conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 1.337 });

        await baseEvent.save();
        await impressionEvent.save();
        await conversionEvent.save();


        const docs = await BaseEvent.find({}).sort('name').exec();

        assert.ok(docs[0] instanceof BaseEvent);
        assert.equal(docs[0].name, 'Base event');

        assert.ok(docs[1] instanceof ConversionEvent);
        assert.equal(docs[1].schema.$originalSchemaId, ConversionEventSchema.$id);
        assert.equal(docs[1].name, 'Conversion event');
        assert.equal(docs[1].revenue, 1.337);

        assert.ok(docs[2] instanceof ImpressionEvent);
        assert.equal(docs[2].schema.$originalSchemaId, ImpressionEventSchema.$id);
        assert.equal(docs[2].name, 'Impression event');
      });

      async function checkHydratesCorrectModels(fields) {
        const baseEvent = new BaseEvent({ name: 'Base event' });
        const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        const conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 1.337 });

        await baseEvent.save();
        await impressionEvent.save();
        await conversionEvent.save();

        const docs = await BaseEvent.find({}, fields).sort('name').exec();

        assert.ok(docs[0] instanceof BaseEvent);
        assert.equal(docs[0].name, 'Base event');

        assert.ok(docs[1] instanceof ConversionEvent);
        assert.equal(docs[1].schema.$originalSchemaId, ConversionEventSchema.$id);
        assert.equal(docs[1].name, 'Conversion event');
        assert.equal(docs[1].revenue, undefined);

        assert.ok(docs[2] instanceof ImpressionEvent);
        assert.equal(docs[2].schema.$originalSchemaId, ImpressionEventSchema.$id);
        assert.equal(docs[2].name, 'Impression event');
      }

      it('hydrates correct models when fields selection set as string', async function() {
        await checkHydratesCorrectModels('name');
      });

      it('hydrates correct models when fields selection set as object', async function() {
        await checkHydratesCorrectModels({ name: 1 });
      });

      it('casts underneath $or if discriminator key in filter (gh-9018)', async function() {
        await ImpressionEvent.create({ name: 'Impression event', element: '42' });
        await ConversionEvent.create({ name: 'Conversion event', revenue: 1.337 });

        let docs = await BaseEvent.find({ __t: 'Impression', element: 42 });
        assert.equal(docs.length, 1);
        assert.equal(docs[0].name, 'Impression event');

        docs = await BaseEvent.find({ $or: [{ __t: 'Impression', element: 42 }] });
        assert.equal(docs.length, 1);
        assert.equal(docs[0].name, 'Impression event');

        docs = await BaseEvent.find({
          $or: [{ __t: 'Impression', element: 42 }, { __t: 'Conversion', revenue: '1.337' }]
        }).sort({ __t: 1 });
        assert.equal(docs.length, 2);
        assert.equal(docs[0].name, 'Conversion event');
        assert.equal(docs[1].name, 'Impression event');
      });

      describe('discriminator model only finds documents of its type', function() {

        describe('using "ModelDiscriminator#findById"', function() {
          it('to find a document of the appropriate discriminator', async function() {
            const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
            await impressionEvent.save();

            // via BaseEvent model
            const doc = await BaseEvent.findById(impressionEvent._id);

            assert.ok(doc);
            assert.equal(impressionEvent.__t, doc.__t);

            // via ImpressionEvent model discriminator -- should be present
            const doc2 = await ImpressionEvent.findById(impressionEvent._id);

            assert.ok(doc2);
            assert.equal(impressionEvent.__t, doc2.__t);

            // via ConversionEvent model discriminator -- should not be present
            const doc3 = await ConversionEvent.findById(impressionEvent._id);
            assert.ok(!doc3);
          });
        });

        describe('using "ModelDiscriminator#find"', function() {
          it('to find documents of the appropriate discriminator', async function() {
            const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
            const conversionEvent1 = new ConversionEvent({ name: 'Conversion event 1', revenue: 1 });
            const conversionEvent2 = new ConversionEvent({ name: 'Conversion event 2', revenue: 2 });
            await impressionEvent.save();
            await conversionEvent1.save();
            await conversionEvent2.save();

            // doesn't find anything since we're querying for an impression id
            const query = ConversionEvent.find({ _id: impressionEvent._id });
            assert.equal(query.op, 'find');
            assert.deepEqual(query._conditions, { _id: impressionEvent._id, __t: 'Conversion' });
            const documents = await query.exec();
            assert.equal(documents.length, 0);

            // now find one with no criteria given and ensure it gets added to _conditions
            const query2 = ConversionEvent.find();
            assert.deepEqual(query2._conditions, { __t: 'Conversion' });
            assert.equal(query2.op, 'find');
            const documents2 = await query2.exec();
            assert.equal(documents2.length, 2);

            assert.ok(documents2[0] instanceof ConversionEvent);
            assert.equal(documents2[0].__t, 'Conversion');

            assert.ok(documents2[1] instanceof ConversionEvent);
            assert.equal(documents2[1].__t, 'Conversion');
          });
        });
      });

      const checkDiscriminatorModelsFindDocumentsOfItsType = async function(fields) {
        const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        const conversionEvent1 = new ConversionEvent({ name: 'Conversion event 1', revenue: 1 });
        const conversionEvent2 = new ConversionEvent({ name: 'Conversion event 2', revenue: 2 });

        await impressionEvent.save();
        await conversionEvent1.save();
        await conversionEvent2.save();

        // doesn't find anything since we're querying for an impression id
        const query = ConversionEvent.find({ _id: impressionEvent._id }, fields);
        assert.equal(query.op, 'find');
        assert.deepEqual(query._conditions, { _id: impressionEvent._id, __t: 'Conversion' });
        const documents = await query.exec();

        assert.equal(documents.length, 0);

        // now find one with no criteria given and ensure it gets added to _conditions
        const query2 = ConversionEvent.find({}, fields);
        assert.deepEqual(query2._conditions, { __t: 'Conversion' });
        assert.equal(query2.op, 'find');
        const documents2 = await query2.exec();

        assert.equal(documents2.length, 2);

        assert.ok(documents2[0] instanceof ConversionEvent);
        assert.equal(documents2[0].__t, 'Conversion');

        assert.ok(documents2[1] instanceof ConversionEvent);
        assert.equal(documents2[1].__t, 'Conversion');
      };

      it('discriminator model only finds documents of its type when fields selection set as string inclusive', function() {
        return checkDiscriminatorModelsFindDocumentsOfItsType('name');
      });

      it('discriminator model only finds documents of its type when fields selection set as string exclusive', function() {
        return checkDiscriminatorModelsFindDocumentsOfItsType('-revenue');
      });

      it('discriminator model only finds documents of its type when fields selection set as empty string', function() {
        return checkDiscriminatorModelsFindDocumentsOfItsType('');
      });

      it('discriminator model only finds documents of its type when fields selection set as object inclusive', function() {
        return checkDiscriminatorModelsFindDocumentsOfItsType({ name: 1 });
      });

      it('discriminator model only finds documents of its type when fields selection set as object exclusive', function() {
        return checkDiscriminatorModelsFindDocumentsOfItsType({ revenue: 0 });
      });

      it('discriminator model only finds documents of its type when fields selection set as empty object', function() {
        return checkDiscriminatorModelsFindDocumentsOfItsType({});
      });
    });

    describe('findOne', function() {
      it('when selecting `select: false` field (gh-4629) (gh-11546)', async function() {
        const s = new SecretEvent({ name: 'test', secret: 'test2' });
        await s.save();

        let doc = await SecretEvent.findById(s._id, '+secret');
        assert.equal(doc.__t, 'Secret');
        assert.equal(doc.name, 'test');
        assert.equal(doc.secret, 'test2');

        doc = await BaseEvent.findOne({ _id: s._id }, 'name -__t');
        assert.strictEqual(doc.__t, undefined);
        assert.equal(doc.name, 'test');
        assert.strictEqual(doc.secret, undefined);
      });

      it('select: false in base schema (gh-5448)', async function() {
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

        await Bar.create(obj);

        const docs = await Foo.find().select('+hiddenColumn');

        assert.equal(docs.length, 1);
        assert.equal(docs[0].hiddenColumn, 'Wanna see me?');
        assert.equal(docs[0].foo, 'test');
        assert.equal(docs[0].bar, 'test2');
      });

      it('hydrates correct model', async function() {
        const baseEvent = new BaseEvent({ name: 'Base event' });

        const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        const conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 1.337 });

        await baseEvent.save();

        await impressionEvent.save();
        await conversionEvent.save();

        // finds & hydrates BaseEvent
        const event = await BaseEvent.findOne({ _id: baseEvent._id });

        assert.ok(event instanceof BaseEvent);
        assert.equal(event.name, 'Base event');

        // finds & hydrates ImpressionEvent
        const foundImpressionEvent = await BaseEvent.findOne({ _id: impressionEvent._id });

        assert.ok(foundImpressionEvent instanceof ImpressionEvent);
        assert.equal(foundImpressionEvent.schema.$originalSchemaId, ImpressionEventSchema.$id);
        assert.equal(foundImpressionEvent.name, 'Impression event');

        // finds & hydrates ConversionEvent
        const foundConversionEvent = await BaseEvent.findOne({ _id: conversionEvent._id });

        assert.ok(foundConversionEvent instanceof ConversionEvent);
        assert.deepEqual(foundConversionEvent.schema.$originalSchemaId, ConversionEventSchema.$id);
        assert.equal(foundConversionEvent.name, 'Conversion event');
      });

      async function checkHydratesCorrectModels(fields, checkUndefinedRevenue) {
        const baseEvent = new BaseEvent({ name: 'Base event' });
        const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        const conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 1.337 });

        await baseEvent.save();

        await impressionEvent.save();
        await conversionEvent.save();

        // finds & hydrates BaseEvent
        const foundBaseEvent = await BaseEvent.findOne({ _id: baseEvent._id }, fields);
        assert.ok(foundBaseEvent instanceof BaseEvent);
        assert.equal(foundBaseEvent.name, 'Base event');

        // finds & hydrates ImpressionEvent
        const foundImpressionEvent = await BaseEvent.findOne({ _id: impressionEvent._id }, fields);

        assert.ok(foundImpressionEvent instanceof ImpressionEvent);
        assert.equal(
          foundImpressionEvent.schema.$originalSchemaId,
          ImpressionEventSchema.$id
        );
        assert.equal(foundImpressionEvent.name, 'Impression event');

        // finds & hydrates ConversionEvent
        const foundConversionEvent = await BaseEvent.findOne({ _id: conversionEvent._id }, fields);

        assert.ok(foundConversionEvent instanceof ConversionEvent);
        assert.deepEqual(foundConversionEvent.schema.$originalSchemaId,
          ConversionEventSchema.$id);
        assert.equal(foundConversionEvent.name, 'Conversion event');
        if (checkUndefinedRevenue === true) {
          assert.equal(foundConversionEvent.revenue, undefined);
        }
      }

      it('hydrates correct model when fields selection set as string inclusive', async function() {
        await checkHydratesCorrectModels('name', true);
      });

      it('hydrates correct model when fields selection set as string exclusive', async function() {
        await checkHydratesCorrectModels('-revenue', true);
      });

      it('hydrates correct model when fields selection set as empty string', async function() {
        await checkHydratesCorrectModels('');
      });

      it('hydrates correct model when fields selection set as object inclusive', async function() {
        await checkHydratesCorrectModels({ name: 1 }, true);
      });

      it('hydrates correct model when fields selection set as object exclusive', async function() {
        await checkHydratesCorrectModels({ revenue: 0 }, true);
      });

      it('hydrates correct model when fields selection set as empty object', async function() {
        await checkHydratesCorrectModels({});
      });

      it('discriminator model only finds a document of its type', async function() {
        const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        const conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 2 });

        await impressionEvent.save();
        await conversionEvent.save();

        // doesn't find anything since we're querying for an impression id
        const query = ConversionEvent.findOne({ _id: impressionEvent._id });
        assert.equal(query.op, 'findOne');
        assert.deepEqual(query._conditions, { _id: impressionEvent._id, __t: 'Conversion' });

        const document = await query.exec();
        assert.equal(document, null);

        // now find one with no criteria given and ensure it gets added to _conditions
        const query2 = ConversionEvent.findOne();
        assert.equal(query2.op, 'findOne');
        assert.deepEqual(query2._conditions, { __t: 'Conversion' });

        const document2 = await query2.exec();
        assert.ok(document2 instanceof ConversionEvent);
        assert.equal(document2.__t, 'Conversion');
      });

      const checkDiscriminatorModelsFindOneDocumentOfItsType = async function(fields) {
        const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        const conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 2 });

        await impressionEvent.save();
        await conversionEvent.save();

        // doesn't find anything since we're querying for an impression id
        const query = ConversionEvent.findOne({ _id: impressionEvent._id }, fields);
        assert.equal(query.op, 'findOne');
        assert.deepEqual(query._conditions, { _id: impressionEvent._id, __t: 'Conversion' });

        const document = await query.exec();
        assert.equal(document, null);

        // now find one with no criteria given and ensure it gets added to _conditions
        const query2 = ConversionEvent.findOne({}, fields);
        assert.equal(query2.op, 'findOne');
        assert.deepEqual(query2._conditions, { __t: 'Conversion' });

        const document2 = await query2.exec();
        assert.ok(document2 instanceof ConversionEvent);
        assert.equal(document2.__t, 'Conversion');
      };

      it('discriminator model only finds a document of its type when fields selection set as string inclusive', function() {
        return checkDiscriminatorModelsFindOneDocumentOfItsType('name');
      });

      it('discriminator model only finds a document of its type when fields selection set as string exclusive', function() {
        return checkDiscriminatorModelsFindOneDocumentOfItsType('-revenue');
      });

      it('discriminator model only finds a document of its type when fields selection set as empty string', function() {
        return checkDiscriminatorModelsFindOneDocumentOfItsType('');
      });

      it('discriminator model only finds a document of its type when fields selection set as object inclusive', function() {
        return checkDiscriminatorModelsFindOneDocumentOfItsType({ name: 1 });
      });

      it('discriminator model only finds a document of its type when fields selection set as object exclusive', function() {
        return checkDiscriminatorModelsFindOneDocumentOfItsType({ revenue: 0 });
      });

      it('discriminator model only finds a document of its type when fields selection set as empty object', function() {
        return checkDiscriminatorModelsFindOneDocumentOfItsType({});
      });
    });

    describe('findOneAndUpdate', function() {
      it('does not update models of other types', async function() {
        const baseEvent = new BaseEvent({ name: 'Base event' });
        const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        const conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 1.337 });

        await baseEvent.save();
        await impressionEvent.save();
        await conversionEvent.save();

        const query = ConversionEvent.findOneAndUpdate({ name: 'Impression event' }, { $set: { name: 'Impression event - updated' } });
        assert.deepEqual(query._conditions, { name: 'Impression event', __t: 'Conversion' });
        const document = await query.exec();
        assert.equal(document, null);
      });


      it('updates models of its own type', async function() {
        const baseEvent = new BaseEvent({ name: 'Base event' });
        const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        const conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 1.337 });

        await baseEvent.save();
        await impressionEvent.save();
        await conversionEvent.save();

        const query = ConversionEvent.findOneAndUpdate({ name: 'Conversion event' }, { $set: { name: 'Conversion event - updated' } }, { new: true });
        assert.deepEqual(query._conditions, { name: 'Conversion event', __t: 'Conversion' });

        const document = await query.exec();

        const expected = conversionEvent.toJSON();
        expected.name = 'Conversion event - updated';
        assert.deepEqual(document.toJSON(), expected);
      });

      it('base model modifies any event type', async function() {
        const baseEvent = new BaseEvent({ name: 'Base event' });
        const impressionEvent = new ImpressionEvent({ name: 'Impression event' });
        const conversionEvent = new ConversionEvent({ name: 'Conversion event', revenue: 1.337 });

        await baseEvent.save();
        await impressionEvent.save();
        await conversionEvent.save();

        const query = BaseEvent.findOneAndUpdate({ name: 'Conversion event' }, { $set: { name: 'Conversion event - updated' } }, { new: true });
        assert.deepEqual(query._conditions, { name: 'Conversion event' });
        const document = await query.exec();
        const expected = conversionEvent.toJSON();
        expected.name = 'Conversion event - updated';
        assert.deepEqual(document.toJSON(), expected);
      });
    });

    describe('population/reference mapping', function() {
      it('populates and hydrates correct models', async function() {
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

        const vehicle = await Vehicle.create({});
        const car = await Car.create({ speed: 160 });
        const bus = await Bus.create({ speed: 80 });

        await User.create({ vehicles: [vehicle._id, car._id, bus._id], favoriteVehicle: car._id, favoriteBus: bus._id });

        const user = await User.findOne({}).populate('vehicles favoriteVehicle favoriteBus').exec();

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
      });

      it('reference in child schemas (gh-2719)', async function() {
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

        const garage = await Garage.create({ name: 'My', num_of_places: 3 });
        await Car.create({ speed: 160, garage });
        await Bus.create({ speed: 80, garage });

        const vehicles = await Vehicle.find({}).populate('garage');

        vehicles.forEach(function(v) {
          assert.ok(v.garage instanceof Garage);
        });
      });

      it('populates parent array reference (gh-4643)', async function() {
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

        const wheel = await Wheel.create({ brand: 'Rotiform' });
        await Bus.create({ speed: 80, wheels: [wheel] });
        const bus = await Bus.findOne({}).populate('wheels');

        assert.ok(bus instanceof Vehicle);
        assert.ok(bus instanceof Bus);
        assert.equal(bus.wheels.length, 1);
        assert.ok(bus.wheels[0] instanceof Wheel);
        assert.equal(bus.wheels[0].brand, 'Rotiform');
      });

      it('updating discriminator key (gh-5613)', async() => {
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

        const doc = await Org.create({ name: 'test' });
        assert.ok(!doc.__t);
        const updatedDoc = await Org.findByIdAndUpdate(doc._id, { __t: 'D' }, { new: true, overwriteDiscriminatorKey: true });
        assert.equal(updatedDoc.__t, 'D');
      });

      it('disallows updating discriminator key using `$unset` (gh-11456)', async function() {
        const options = { discriminatorKey: 'kind' };
        const eventSchema = new Schema({ time: Date }, options);
        db.deleteModel(/Event/);
        const Event = db.model('Event', eventSchema);
        const ClickedLinkEvent = Event.discriminator('ClickedLink',
          new Schema({ url: String }, options));

        const err = await ClickedLinkEvent.updateMany({}, { $unset: { kind: '' } }, { strict: 'throw' }).then(() => null, err => err);
        assert.ok(err);
        assert.ok(err.message.includes('discriminator key'), err.message);

        await ClickedLinkEvent.create({
          time: new Date(),
          url: 'http://www.example.com'
        });

        let doc = await ClickedLinkEvent.findOneAndUpdate({}, { $unset: { kind: '' } }, { new: true }).lean();
        assert.equal(doc.kind, 'ClickedLink');

        doc = await ClickedLinkEvent.findOneAndUpdate(
          {},
          { $unset: { kind: '' } },
          { new: true, overwriteDiscriminatorKey: true }
        ).lean();
        assert.equal(doc.kind, void 0);
      });

      it('allows updating discriminator key using `overwriteDiscriminatorKey` with `strict: throw` (gh-12513)', async function() {
        const options = { discriminatorKey: 'kind', strict: 'throw' };
        const eventSchema = new Schema({ time: Date }, options);
        db.deleteModel(/Event/);
        const Event = db.model('Event', eventSchema);
        const ClickedLinkEvent = Event.discriminator('ClickedLink',
          new Schema({ url: String }, options));

        await ClickedLinkEvent.create({
          time: new Date(),
          url: 'http://www.example.com'
        });

        let doc = await Event.findOneAndUpdate(
          {},
          { $set: { kind: 'foo' } },
          { new: true, overwriteDiscriminatorKey: true }
        ).lean();
        assert.equal(doc.kind, 'foo');

        doc = await Event.findOneAndUpdate(
          {},
          { kind: 'bar' },
          { new: true, overwriteDiscriminatorKey: true }
        ).lean();
        assert.equal(doc.kind, 'bar');
      });

      it('allows updating document where discriminator key is present in payload but have the same value (13055)', async function() {
        const options = { discriminatorKey: 'kind', strict: 'throw' };
        const eventSchema = new Schema({ time: Date }, options);
        db.deleteModel(/Event/);
        const Event = db.model('Event', eventSchema);
        const ClickedLinkEvent = Event.discriminator('ClickedLink',
          new Schema({ url: String }, options));

        await ClickedLinkEvent.create({
          time: new Date(),
          url: 'http://www.example.com'
        });

        const doc = await ClickedLinkEvent.findOneAndUpdate(
          {},
          { $set: { url: 'http://www.new-url.com', kind: 'ClickedLink' } },
          { new: true }
        ).lean();
        assert.equal(doc.url, 'http://www.new-url.com');
      });

      it('reference in child schemas (gh-2719-2)', async function() {
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

        const survey = await Survey.create({
          name: 'That you see?',
          date: Date.now()
        });

        await Talk.create({
          name: 'Meetup rails',
          date: new Date('2015-04-01T00:00:00Z'),
          pin: '0004',
          period: { start: '11:00', end: '12:00' },
          surveys: [survey]
        });

        const events = await Event.find({}).populate('surveys').exec();

        assert.ok(events[0].surveys[0] instanceof Survey);
      });

      it('correctly populates doc with nonexistent discriminator key (gh-10082)', async function() {
        const foodSchema = Schema({ name: String, animal: String });
        const Food = db.model('Food', foodSchema);

        const animalSchema = Schema({ type: String }, {
          discriminatorKey: 'type',
          toJSON: { virtuals: true },
          toObject: { virtuals: true }
        });
        const catSchema = Schema({ catYears: Number });
        animalSchema.virtual('foods', {
          ref: 'Food',
          localField: 'type',
          foreignField: 'animal',
          justOne: false
        });
        const Animal = db.model('Animal', animalSchema);
        Animal.discriminator('cat', catSchema);

        await Promise.all([
          Food.create({ name: 'Cat Food', animal: 'cat' }),
          Food.create({ name: 'Rabbit Food', animal: 'rabbit' })
        ]);
        await Animal.collection.insertOne({ type: 'cat', catYears: 4 });
        await Animal.collection.insertOne({ type: 'rabbit' }); // <-- "rabbit" has no discriminator

        const cat = await Animal.findOne({ type: 'cat' }).populate('foods');
        const rabbit = await Animal.findOne({ type: 'rabbit' }).populate('foods');
        assert.equal(cat.foods.length, 1);
        assert.equal(cat.foods[0].name, 'Cat Food');
        assert.equal(rabbit.foods.length, 1);
        assert.equal(rabbit.foods[0].name, 'Rabbit Food');

      });
    });

    describe('deleteOne and deleteMany (gh-8471)', function() {
      it('adds discriminator filter if no conditions passed', async() => {
        const PeopleSchema = Schema({ job: String, name: String },
          { discriminatorKey: 'job' });

        const People = db.model('Person', PeopleSchema);

        const DesignerSchema = Schema({ badge: String });
        const Designer = People.discriminator('Designer', DesignerSchema, 'Designer');

        const DeveloperSchema = Schema({ coffeeAmount: Number });
        const Developer = People.discriminator('Developer', DeveloperSchema, 'Developer');

        await Designer.create({
          name: 'John',
          job: 'Designer',
          badge: 'green'
        });

        let numDesigners = await Designer.countDocuments();
        let numDevelopers = await Developer.countDocuments();
        let total = await People.countDocuments();
        assert.equal(numDesigners, 1);
        assert.equal(numDevelopers, 0);
        assert.equal(total, 1);

        await Developer.deleteOne();

        numDesigners = await Designer.countDocuments();
        numDevelopers = await Developer.countDocuments();
        total = await People.countDocuments();
        assert.equal(numDesigners, 1);
        assert.equal(numDevelopers, 0);
        assert.equal(total, 1);

        await Developer.create([
          { name: 'Mike', job: 'Developer', coffeeAmount: 25 },
          { name: 'Joe', job: 'Developer', coffeeAmount: 14 }
        ]);

        numDesigners = await Designer.countDocuments();
        numDevelopers = await Developer.countDocuments();
        total = await People.countDocuments();
        assert.equal(numDesigners, 1);
        assert.equal(numDevelopers, 2);
        assert.equal(total, 3);

        await Developer.deleteMany();

        numDesigners = await Designer.countDocuments();
        numDevelopers = await Developer.countDocuments();
        total = await People.countDocuments();
        assert.equal(numDesigners, 1);
        assert.equal(numDevelopers, 0);
        assert.equal(total, 1);
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
        it('to aggregate documents of all discriminators', async function() {
          const aggregate = BaseEvent.aggregate([
            { $match: { name: 'Test Event' } }
          ]);

          const docs = await aggregate.exec();

          assert.deepEqual(aggregate._pipeline, [
            { $match: { name: 'Test Event' } }
          ]);
          assert.equal(docs.length, 2);
        });
      });

      describe('using "ModelDiscriminator#aggregate"', function() {
        it('only aggregates documents of the appropriate discriminator', async function() {
          const aggregate = ImpressionEvent.aggregate([
            { $group: { _id: '$__t', count: { $sum: 1 } } }
          ]);

          const result = await aggregate.exec();

          assert.deepEqual(aggregate._pipeline, [
            { $match: { __t: 'Impression' } },
            { $group: { _id: '$__t', count: { $sum: 1 } } }
          ]);

          assert.equal(result.length, 1);
          assert.deepEqual(result, [
            { _id: 'Impression', count: 2 }
          ]);
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

        it('doesnt exclude field if slice (gh-4991)', async function() {
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
          await Discriminator.create(obj);
          const docs = await Base.find().slice('array', 1).exec();
          assert.equal(docs.length, 1);
          assert.equal(docs[0].propA, 'Hi');
        });

        it('merges the first pipeline stages if applicable', async function() {
          const aggregate = ImpressionEvent.aggregate([
            { $match: { name: 'Test Event' } }
          ]);

          const result = await aggregate.exec();

          // Discriminator `$match` pipeline step was added on the
          // `exec` step. The reasoning for this is to not let
          // aggregations with empty pipelines, but that are over
          // discriminators be executed
          assert.deepEqual(aggregate._pipeline, [
            { $match: { __t: 'Impression', name: 'Test Event' } }
          ]);

          assert.equal(result.length, 1);
          assert.equal(result[0]._id, impressionEvent.id);
        });
      });
    });
  });
});
