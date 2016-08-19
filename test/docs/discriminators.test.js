var assert = require('power-assert');
var async = require('async');
var mongoose = require('../../');

describe('discriminator docs', function () {
  var Event;
  var ClickedLinkEvent;
  var SignedUpEvent;
  var db;

  before(function (done) {
    db = mongoose.createConnection('mongodb://localhost:27017/mongoose_test');

    var eventSchema = new mongoose.Schema({time: Date});
    Event = db.model('_event', eventSchema);

    ClickedLinkEvent = Event.discriminator('ClickedLink',
      new mongoose.Schema({url: String}));

    SignedUpEvent = Event.discriminator('SignedUp',
      new mongoose.Schema({username: String}));

    done();
  });

  after(function (done) {
    db.close(done);
  });

  beforeEach(function (done) {
    Event.remove({}, done);
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
   * 2 parameters, a model name and a discriminator schema. It returns a
   * model whose schema is the union of the base schema and the
   * discriminator schema.
   */
  it('The `model.discriminator()` function', function (done) {
    var options = {discriminatorKey: 'kind'};

    var eventSchema = new mongoose.Schema({time: Date}, options);
    var Event = mongoose.model('Event', eventSchema);

    // ClickedLinkEvent is a special type of Event that has
    // a URL.
    var ClickedLinkEvent = Event.discriminator('ClickedLink',
      new mongoose.Schema({url: String}, options));

    // When you create a generic event, it can't have a URL field...
    var genericEvent = new Event({time: Date.now(), url: 'google.com'});
    assert.ok(!genericEvent.url);

    // But a ClickedLinkEvent can
    var clickedEvent =
      new ClickedLinkEvent({time: Date.now(), url: 'google.com'});
    assert.ok(clickedEvent.url);

    // acquit:ignore:start
    done();
    // acquit:ignore:end
  });

  /**
   * Suppose you created another discriminator to track events where
   * a new user registered. These `SignedUpEvent` instances will be
   * stored in the same collection as generic events and `ClickedLinkEvent`
   * instances.
   */
  it('Discriminators save to the Event model\'s collection', function (done) {
    var event1 = new Event({time: Date.now()});
    var event2 = new ClickedLinkEvent({time: Date.now(), url: 'google.com'});
    var event3 = new SignedUpEvent({time: Date.now(), user: 'testuser'});

    var save = function (doc, callback) {
      doc.save(function (error, doc) {
        callback(error, doc);
      });
    };

    async.map([event1, event2, event3], save, function (error) {
      // acquit:ignore:start
      assert.ifError(error);
      // acquit:ignore:end

      Event.count({}, function (error, count) {
        // acquit:ignore:start
        assert.ifError(error);
        // acquit:ignore:end
        assert.equal(count, 3);
        // acquit:ignore:start
        done();
        // acquit:ignore:end
      });
    });
  });

  /**
   * The way mongoose tells the difference between the different
   * discriminator models is by the 'discriminator key', which is
   * `__t` by default. Mongoose adds a String path called `__t`
   * to your schemas that it uses to track which discriminator
   * this document is an instance of.
   */
  it('Discriminator keys', function (done) {
    var event1 = new Event({time: Date.now()});
    var event2 = new ClickedLinkEvent({time: Date.now(), url: 'google.com'});
    var event3 = new SignedUpEvent({time: Date.now(), user: 'testuser'});

    assert.ok(!event1.__t);
    assert.equal(event2.__t, 'ClickedLink');
    assert.equal(event3.__t, 'SignedUp');

    // acquit:ignore:start
    done();
    // acquit:ignore:end
  });

  /**
   * Discriminator models are special; they attach the discriminator key
   * to queries. In other words, `find()`, `count()`, `aggregate()`, etc.
   * are smart enough to account for discriminators.
   */
  it('Discriminators add the discriminator key to queries', function (done) {
    var event1 = new Event({time: Date.now()});
    var event2 = new ClickedLinkEvent({time: Date.now(), url: 'google.com'});
    var event3 = new SignedUpEvent({time: Date.now(), user: 'testuser'});

    var save = function (doc, callback) {
      doc.save(function (error, doc) {
        callback(error, doc);
      });
    };

    async.map([event1, event2, event3], save, function (error) {
      // acquit:ignore:start
      assert.ifError(error);
      // acquit:ignore:end

      ClickedLinkEvent.find({}, function (error, docs) {
        // acquit:ignore:start
        assert.ifError(error);
        // acquit:ignore:end
        assert.equal(docs.length, 1);
        assert.equal(docs[0]._id.toString(), event2._id.toString());
        assert.equal(docs[0].url, 'google.com');
        // acquit:ignore:start
        done();
        // acquit:ignore:end
      });
    });
  });

  /**
   * Discriminators also take their base schema's pre and post middleware.
   * However, you can also attach middleware to the discriminator schema
   * without affecting the base schema.
   */
  it('Discriminators copy pre and post hooks', function (done) {
    var options = {discriminatorKey: 'kind'};

    var eventSchema = new mongoose.Schema({time: Date}, options);
    var eventSchemaCalls = 0;
    eventSchema.pre('validate', function (next) {
      ++eventSchemaCalls;
      next();
    });
    var Event = mongoose.model('GenericEvent', eventSchema);

    var clickedLinkSchema = new mongoose.Schema({url: String}, options);
    var clickedSchemaCalls = 0;
    clickedLinkSchema.pre('validate', function (next) {
      ++clickedSchemaCalls;
      next();
    });
    var ClickedLinkEvent = Event.discriminator('ClickedLinkEvent',
      clickedLinkSchema);

    var event1 = new ClickedLinkEvent();
    event1.validate(function () {
      assert.equal(eventSchemaCalls, 1);
      assert.equal(clickedSchemaCalls, 1);

      var generic = new Event();
      generic.validate(function () {
        assert.equal(eventSchemaCalls, 2);
        assert.equal(clickedSchemaCalls, 1);
        // acquit:ignore:start
        done();
        // acquit:ignore:end
      });
    });
  });

  /**
   * A discriminator's fields are the union of the base schema's fields and
   * the discriminator schema's fields, and the discriminator schema's fields
   * take precedence. This behavior gets quirky when you have a custom `_id`
   * field. A schema gets an `_id` field by default, so the base schema's
   * `_id` field will get overridden by the discriminator schema's default
   * `_id` field.
   *
   * You can work around this by setting the `_id` option to false in the
   * discriminator schema as shown below.
   */
  it('Handling custom _id fields', function (done) {
    var options = {discriminatorKey: 'kind'};

    // Base schema has a String _id...
    var eventSchema = new mongoose.Schema({_id: String, time: Date},
      options);
    var Event = mongoose.model('BaseEvent', eventSchema);

    var clickedLinkSchema = new mongoose.Schema({url: String}, options);
    var ClickedLinkEvent = Event.discriminator('ChildEventBad',
      clickedLinkSchema);

    var event1 = new ClickedLinkEvent();
    // Woops, clickedLinkSchema overwrote the custom _id
    assert.ok(event1._id instanceof mongoose.Types.ObjectId);

    // But if you set `_id` option to false...
    clickedLinkSchema = new mongoose.Schema({url: String},
      {discriminatorKey: 'kind', _id: false});
    ClickedLinkEvent = Event.discriminator('ChildEventGood',
      clickedLinkSchema);

    // The custom _id from the base schema comes through
    var event2 = new ClickedLinkEvent({_id: 'test'});
    assert.ok(event2._id.toString() === event2._id);
    // acquit:ignore:start
    done();
    // acquit:ignore:end
  });
});
