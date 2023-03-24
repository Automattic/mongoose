'use strict';

const assert = require('assert');
const mongoose = require('../../');
const start = require('../common');

const Schema = mongoose.Schema;

describe('discriminator docs', function() {
  let Event;
  let ClickedLinkEvent;
  let SignedUpEvent;
  let db;

  before(function() {
    db = mongoose.createConnection(start.uri);

    const eventSchema = new mongoose.Schema({ time: Date });
    Event = db.model('_event', eventSchema);

    ClickedLinkEvent = Event.discriminator('ClickedLink',
      new mongoose.Schema({ url: String }));

    SignedUpEvent = Event.discriminator('SignedUp',
      new mongoose.Schema({ username: String }));
  });

  after(async function() {
    await db.close();
  });

  beforeEach(async function() {
    await Event.deleteMany({});
  });

  /**
   * Discriminators are a schema inheritance mechanism. They enable
   * you to have multiple models with overlapping schemas on top of the
   * same underlying MongoDB collection.
   *
   * Suppose you wanted to track different types of events in a single
   * collection. Every event will have a timestamp, but events that
   * represent clicked links should have a URL. You can achieve this
   * using the `model.discriminator()` function. This function takes
   * 3 parameters, a model name, a discriminator schema and an optional
   * key (defaults to the model name). It returns a model whose schema
   * is the union of the base schema and the discriminator schema.
   */
  it('The `model.discriminator()` function', function() {
    const options = { discriminatorKey: 'kind' };

    const eventSchema = new mongoose.Schema({ time: Date }, options);
    const Event = mongoose.model('Event', eventSchema);

    // ClickedLinkEvent is a special type of Event that has
    // a URL.
    const ClickedLinkEvent = Event.discriminator('ClickedLink',
      new mongoose.Schema({ url: String }, options));

    // When you create a generic event, it can't have a URL field...
    const genericEvent = new Event({ time: Date.now(), url: 'google.com' });
    assert.ok(!genericEvent.url);

    // But a ClickedLinkEvent can
    const clickedEvent = new ClickedLinkEvent({ time: Date.now(), url: 'google.com' });
    assert.ok(clickedEvent.url);
  });

  /**
   * Suppose you created another discriminator to track events where
   * a new user registered. These `SignedUpEvent` instances will be
   * stored in the same collection as generic events and `ClickedLinkEvent`
   * instances.
   */
  it('Discriminators save to the Event model\'s collection', async function() {
    const event1 = new Event({ time: Date.now() });
    const event2 = new ClickedLinkEvent({ time: Date.now(), url: 'google.com' });
    const event3 = new SignedUpEvent({ time: Date.now(), user: 'testuser' });


    await Promise.all([event1.save(), event2.save(), event3.save()]);
    const count = await Event.countDocuments();
    assert.equal(count, 3);
  });

  /**
   * The way mongoose tells the difference between the different
   * discriminator models is by the 'discriminator key', which is
   * `__t` by default. Mongoose adds a String path called `__t`
   * to your schemas that it uses to track which discriminator
   * this document is an instance of.
   */
  it('Discriminator keys', function() {
    const event1 = new Event({ time: Date.now() });
    const event2 = new ClickedLinkEvent({ time: Date.now(), url: 'google.com' });
    const event3 = new SignedUpEvent({ time: Date.now(), user: 'testuser' });

    assert.ok(!event1.__t);
    assert.equal(event2.__t, 'ClickedLink');
    assert.equal(event3.__t, 'SignedUp');
  });

  it('Update discriminator key', async function() {
    let event = new ClickedLinkEvent({ time: Date.now(), url: 'google.com' });
    await event.save();

    event.__t = 'SignedUp';
    // ValidationError: ClickedLink validation failed: __t: Cast to String failed for value "SignedUp" (type string) at path "__t"
    // acquit:ignore:start
    await assert.rejects(async() => {
    // acquit:ignore:end
      await event.save();
    // acquit:ignore:start
    }, /__t: Cast to String failed/);
    // acquit:ignore:end

    event = await ClickedLinkEvent.findByIdAndUpdate(event._id, { __t: 'SignedUp' }, { new: true });
    event.__t; // 'ClickedLink', update was a no-op
    // acquit:ignore:start
    assert.equal(event.__t, 'ClickedLink');
    // acquit:ignore:end
  });

  it('use overwriteDiscriminatorKey to change discriminator key', async function() {
    let event = new ClickedLinkEvent({ time: Date.now(), url: 'google.com' });
    await event.save();

    event = await ClickedLinkEvent.findByIdAndUpdate(
      event._id,
      { __t: 'SignedUp' },
      { overwriteDiscriminatorKey: true, new: true }
    );
    event.__t; // 'SignedUp', updated discriminator key
    // acquit:ignore:start
    assert.equal(event.__t, 'SignedUp');
    // acquit:ignore:end
  });

  /**
   * Discriminator models are special; they attach the discriminator key
   * to queries. In other words, `find()`, `count()`, `aggregate()`, etc.
   * are smart enough to account for discriminators.
   */
  it('Discriminators add the discriminator key to queries', async function() {
    const event1 = new Event({ time: Date.now() });
    const event2 = new ClickedLinkEvent({ time: Date.now(), url: 'google.com' });
    const event3 = new SignedUpEvent({ time: Date.now(), user: 'testuser' });

    await Promise.all([event1.save(), event2.save(), event3.save()]);
    const docs = await ClickedLinkEvent.find({});

    assert.equal(docs.length, 1);
    assert.equal(docs[0]._id.toString(), event2._id.toString());
    assert.equal(docs[0].url, 'google.com');
  });

  /**
   * Discriminators also take their base schema's pre and post middleware.
   * However, you can also attach middleware to the discriminator schema
   * without affecting the base schema.
   */
  it('Discriminators copy pre and post hooks', async function() {
    const options = { discriminatorKey: 'kind' };

    const eventSchema = new mongoose.Schema({ time: Date }, options);
    let eventSchemaCalls = 0;
    eventSchema.pre('validate', function(next) {
      ++eventSchemaCalls;
      next();
    });
    const Event = mongoose.model('GenericEvent', eventSchema);

    const clickedLinkSchema = new mongoose.Schema({ url: String }, options);
    let clickedSchemaCalls = 0;
    clickedLinkSchema.pre('validate', function(next) {
      ++clickedSchemaCalls;
      next();
    });
    const ClickedLinkEvent = Event.discriminator('ClickedLinkEvent',
      clickedLinkSchema);

    const event1 = new ClickedLinkEvent();
    await event1.validate();

    assert.equal(eventSchemaCalls, 1);
    assert.equal(clickedSchemaCalls, 1);

    const generic = new Event();
    await generic.validate();

    assert.equal(eventSchemaCalls, 2);
    assert.equal(clickedSchemaCalls, 1);
  });

  /**
   * A discriminator's fields are the union of the base schema's fields and
   * the discriminator schema's fields, and the discriminator schema's fields
   * take precedence. There is one exception: the `_id` field.
   * If a custom _id field is set on the base schema, that will always
   * override the discriminator's _id field, as shown below.
   */
  it('Handling custom _id fields', function() {
    const options = { discriminatorKey: 'kind' };

    // Base schema has a custom String `_id` and a Date `time`...
    const eventSchema = new mongoose.Schema({ _id: String, time: Date },
      options);
    const Event = mongoose.model('BaseEvent', eventSchema);

    const clickedLinkSchema = new mongoose.Schema({
      url: String,
      time: String
    }, options);
    // The discriminator schema has a String `time` and an
    // implicitly added ObjectId `_id`.
    assert.ok(clickedLinkSchema.path('_id'));
    assert.equal(clickedLinkSchema.path('_id').instance, 'ObjectId');
    const ClickedLinkEvent = Event.discriminator('ChildEventBad',
      clickedLinkSchema);

    const event1 = new ClickedLinkEvent({ _id: 'custom id', time: '4pm' });
    // clickedLinkSchema overwrites the `time` path, but **not**
    // the `_id` path.
    assert.strictEqual(typeof event1._id, 'string');
    assert.strictEqual(typeof event1.time, 'string');
  });

  /**
   * When you use `Model.create()`, mongoose will pull the correct type from
   * the discriminator key for you.
   */
  it('Using discriminators with `Model.create()`', async function() {
    const Schema = mongoose.Schema;
    const shapeSchema = new Schema({
      name: String
    }, { discriminatorKey: 'kind' });

    const Shape = db.model('Shape', shapeSchema);

    const Circle = Shape.discriminator('Circle',
      new Schema({ radius: Number }));
    const Square = Shape.discriminator('Square',
      new Schema({ side: Number }));

    const shapes = await Shape.create([
      { name: 'Test' },
      { kind: 'Circle', radius: 5 },
      { kind: 'Square', side: 10 }
    ]);

    assert.ok(shapes[0] instanceof Shape);
    assert.ok(shapes[1] instanceof Circle);
    assert.equal(shapes[1].radius, 5);
    assert.ok(shapes[2] instanceof Square);
    assert.equal(shapes[2].side, 10);
  });

  /**
   * You can also define discriminators on embedded document arrays.
   * Embedded discriminators are different because the different discriminator
   * types are stored in the same document array (within a document) rather
   * than the same collection. In other words, embedded discriminators let
   * you store subdocuments matching different schemas in the same array.
   *
   * As a general best practice, make sure you declare any hooks on your
   * schemas **before** you use them. You should **not** call `pre()` or
   * `post()` after calling `discriminator()`
   */
  it('Embedded discriminators in arrays', async function() {
    const eventSchema = new Schema({ message: String },
      { discriminatorKey: 'kind', _id: false });

    const batchSchema = new Schema({ events: [eventSchema] });

    // `batchSchema.path('events')` gets the mongoose `DocumentArray`
    const docArray = batchSchema.path('events');

    // The `events` array can contain 2 different types of events, a
    // 'clicked' event that requires an element id that was clicked...
    const clickedSchema = new Schema({
      element: {
        type: String,
        required: true
      }
    }, { _id: false });
    // Make sure to attach any hooks to `eventSchema` and `clickedSchema`
    // **before** calling `discriminator()`.
    const Clicked = docArray.discriminator('Clicked', clickedSchema);

    // ... and a 'purchased' event that requires the product that was purchased.
    const Purchased = docArray.discriminator('Purchased', new Schema({
      product: {
        type: String,
        required: true
      }
    }, { _id: false }));

    const Batch = db.model('EventBatch', batchSchema);

    // Create a new batch of events with different kinds
    const doc = await Batch.create({
      events: [
        { kind: 'Clicked', element: '#hero', message: 'hello' },
        { kind: 'Purchased', product: 'action-figure-1', message: 'world' }
      ]
    });

    assert.equal(doc.events.length, 2);

    assert.equal(doc.events[0].element, '#hero');
    assert.equal(doc.events[0].message, 'hello');
    assert.ok(doc.events[0] instanceof Clicked);

    assert.equal(doc.events[1].product, 'action-figure-1');
    assert.equal(doc.events[1].message, 'world');
    assert.ok(doc.events[1] instanceof Purchased);

    doc.events.push({ kind: 'Purchased', product: 'action-figure-2' });

    await doc.save();

    assert.equal(doc.events.length, 3);

    assert.equal(doc.events[2].product, 'action-figure-2');
    assert.ok(doc.events[2] instanceof Purchased);
  });

  /**
   * You can also define embedded discriminators on embedded discriminators.
   * In the below example, `sub_events` is an embedded discriminator, and
   * for `sub_event` keys with value 'SubEvent', `sub_events.events` is an
   * embedded discriminator.
   */

  it('Recursive embedded discriminators in arrays', async function() {
    const singleEventSchema = new Schema({ message: String },
      { discriminatorKey: 'kind', _id: false });

    const eventListSchema = new Schema({ events: [singleEventSchema] });

    const subEventSchema = new Schema({
      sub_events: [singleEventSchema]
    }, { _id: false });

    // Make sure to pass `clone: false` as an option to `discriminator()`.
    // Otherwise Mongoose will clone `subEventSchema` and the schema won't
    // be recursive.
    const SubEvent = subEventSchema.path('sub_events').
      discriminator('SubEvent', subEventSchema, { clone: false });
    eventListSchema.path('events').discriminator('SubEvent', subEventSchema, { clone: false });

    const Eventlist = db.model('EventList', eventListSchema);

    // Create a new batch of events with different kinds
    const doc = await Eventlist.create({
      events: [
        { kind: 'SubEvent', sub_events: [{ kind: 'SubEvent', sub_events: [], message: 'test1' }], message: 'hello' },
        { kind: 'SubEvent', sub_events: [{ kind: 'SubEvent', sub_events: [{ kind: 'SubEvent', sub_events: [], message: 'test3' }], message: 'test2' }], message: 'world' }
      ]
    });

    assert.equal(doc.events.length, 2);

    assert.equal(doc.events[0].sub_events[0].message, 'test1');
    assert.equal(doc.events[0].message, 'hello');
    assert.ok(doc.events[0].sub_events[0] instanceof SubEvent);

    assert.equal(doc.events[1].sub_events[0].sub_events[0].message, 'test3');
    assert.equal(doc.events[1].message, 'world');
    assert.ok(doc.events[1].sub_events[0].sub_events[0] instanceof SubEvent);

    doc.events.push({ kind: 'SubEvent', sub_events: [{ kind: 'SubEvent', sub_events: [], message: 'test4' }], message: 'pushed' });

    await doc.save();

    assert.equal(doc.events.length, 3);

    assert.equal(doc.events[2].message, 'pushed');
    assert.ok(doc.events[2].sub_events[0] instanceof SubEvent);
  });

  /**
   * You can also define discriminators on single nested subdocuments, similar
   * to how you can define discriminators on arrays of subdocuments.
   *
   * As a general best practice, make sure you declare any hooks on your
   * schemas **before** you use them. You should **not** call `pre()` or
   * `post()` after calling `discriminator()`
   */
  it('Single nested discriminators', function() {
    const shapeSchema = Schema({ name: String }, { discriminatorKey: 'kind' });
    const schema = Schema({ shape: shapeSchema });

    schema.path('shape').discriminator('Circle', Schema({ radius: String }));
    schema.path('shape').discriminator('Square', Schema({ side: Number }));

    const MyModel = mongoose.model('ShapeTest', schema);

    // If `kind` is set to 'Circle', then `shape` will have a `radius` property
    let doc = new MyModel({ shape: { kind: 'Circle', radius: 5 } });
    doc.shape.radius; // 5
    // acquit:ignore:start
    assert.equal(doc.shape.radius, 5);
    // acquit:ignore:end

    // If `kind` is set to 'Square', then `shape` will have a `side` property
    doc = new MyModel({ shape: { kind: 'Square', side: 10 } });
    doc.shape.side; // 10
    // acquit:ignore:start
    assert.equal(doc.shape.side, 10);
    // acquit:ignore:end
  });
});
