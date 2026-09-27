'use strict';

const assert = require('assert');
const start = require('./common');
const mongoose = start.mongoose;
const { Schema, Types } = mongoose;

describe('populate inference runtime contract (gh-16010)', function() {
  let db;
  let Currency;
  let Route;
  let Order;
  let currency;
  let route;
  let order;

  before(async function() {
    db = start();
    await db.asPromise();
    const currencySchema = new Schema({ name: String, symbol: String, tags: [String] });
    currencySchema.method('display', function() { return this.symbol; });
    Currency = db.model('InferenceCurrency', currencySchema);
    Route = db.model('InferenceRoute', new Schema({
      from: { currency: { type: Schema.Types.ObjectId, ref: Currency.modelName }, label: String },
      currencies: [{ type: Schema.Types.ObjectId, ref: Currency.modelName }]
    }));
    Order = db.model('InferenceOrder', new Schema({
      route: { type: Schema.Types.ObjectId, ref: Route.modelName },
      other: { type: Schema.Types.ObjectId, ref: Route.modelName },
      routes: [{ type: Schema.Types.ObjectId, ref: Route.modelName }],
      stops: [{ route: { type: Schema.Types.ObjectId, ref: Route.modelName }, label: String }]
    }));
    await Promise.all([Currency.deleteMany({}), Route.deleteMany({}), Order.deleteMany({})]);
    currency = await Currency.create({ name: 'Rupee', symbol: 'INR', tags: ['a', 'b'] });
    route = await Route.create({ from: { currency: currency._id, label: 'Origin' }, currencies: [currency._id] });
    order = await Order.create({ route: route._id, other: route._id, routes: [route._id], stops: [{ route: route._id, label: 'Stop' }] });
  });

  after(async function() {
    await db.close();
  });

  for (const leanFirst of [false, true]) {
    it(`supports the nested example with lean ${leanFirst ? 'before' : 'after'} populate`, async function() {
      const query = Order.findById(order._id);
      if (leanFirst) {
        query.lean();
      }
      query.populate({ path: 'route', model: Route, populate: [{ path: 'from.currency', model: Currency, select: 'symbol' }] });
      if (!leanFirst) {
        query.lean();
      }
      const result = await query;
      assert.strictEqual(result.route.from.currency.symbol, 'INR');
      assert.ok(result.route.from.currency._id instanceof Types.ObjectId);
      assert.ok(!('name' in result.route.from.currency));
      assert.ok(!(result.route instanceof mongoose.Document));
      assert.ok(!(result.route.from.currency instanceof mongoose.Document));
    });
  }

  it('preserves hydrated methods across chained calls and strips them with toObject', async function() {
    const result = await Order.findById(order._id)
      .populate({ path: 'route', model: Route, populate: { path: 'from.currency', model: Currency } })
      .populate({ path: 'other', model: Route });
    assert.ok(result.route instanceof mongoose.Document);
    assert.strictEqual(result.route.from.currency.display(), 'INR');
    assert.ok(result.other instanceof mongoose.Document);
    assert.ok(!(result.toObject().route instanceof mongoose.Document));
    assert.ok(result.toObject({ depopulate: true }).route instanceof Types.ObjectId);
    assert.ok(result.toObject({ depopulate: true }).other instanceof Types.ObjectId);
  });

  it('supports lean false on the query and on an individual population', async function() {
    const hydrated = await Order.findById(order._id).populate({ path: 'route', model: Route }).lean(false);
    assert.ok(hydrated.route instanceof mongoose.Document);
    const mixed = await Order.findById(order._id).lean().populate({ path: 'route', model: Route, options: { lean: false } });
    assert.ok(!(mixed instanceof mongoose.Document));
    assert.ok(mixed.route instanceof mongoose.Document);
  });

  it('propagates populate-level lean to nested references', async function() {
    const result = await Order.findById(order._id).populate({
      path: 'route', model: Route, options: { lean: true },
      populate: { path: 'from.currency', model: Currency }
    });
    assert.ok(result instanceof mongoose.Document);
    assert.ok(!(result.route instanceof mongoose.Document));
    assert.ok(!(result.route.from.currency instanceof mongoose.Document));
  });

  it('returns null for missing singular references and filters missing array references', async function() {
    const missing = new Types.ObjectId();
    const dangling = await Order.create({ route: missing, routes: [route._id, missing] });
    const result = await Order.findById(dangling._id).populate([
      { path: 'route', model: Route }, { path: 'routes', model: Route }
    ]).lean();
    assert.strictEqual(result.route, null);
    assert.strictEqual(result.routes.length, 1);
    const retained = await Order.findById(dangling._id).populate({ path: 'routes', model: Route, retainNullValues: true }).lean();
    assert.strictEqual(retained.routes[1], null);
  });

  it('supports match, justOne, and arrays of subdocuments', async function() {
    const unmatched = await Order.findById(order._id).populate({ path: 'route', model: Route, match: { 'from.label': 'absent' } }).lean();
    assert.strictEqual(unmatched.route, null);
    const single = await Order.findById(order._id).populate({ path: 'routes', model: Route, justOne: true }).lean();
    assert.strictEqual(single.routes.from.label, 'Origin');
    const many = await Order.findById(order._id).populate({ path: 'route', model: Route, justOne: false }).lean();
    assert.strictEqual(many.route[0].from.label, 'Origin');
    const nested = await Order.findById(order._id).populate({ path: 'stops.route', model: Route });
    assert.strictEqual(nested.stops[0].route.from.label, 'Origin');
    assert.strictEqual(nested.stops[0].ownerDocument(), nested);
  });

  for (const select of ['symbol -_id', { symbol: 1, _id: 0 }, ['symbol', '-_id']]) {
    it(`applies inclusion selection ${JSON.stringify(select)}`, async function() {
      const result = await Route.findById(route._id).populate({ path: 'from.currency', model: Currency, select }).lean();
      assert.deepStrictEqual(result.from.currency, { symbol: 'INR' });
    });
  }

  it('applies dotted projections and id-only exclusion projections', async function() {
    const dotted = await Order.findById(order._id).populate({ path: 'route', model: Route, select: 'from.label' }).lean();
    assert.deepStrictEqual(dotted.route.from, { label: 'Origin' });
    const excluded = await Route.findById(route._id).populate({ path: 'from.currency', model: Currency, select: { name: 0, _id: 1 } }).lean();
    assert.strictEqual(excluded.from.currency.symbol, 'INR');
    assert.ok(!('name' in excluded.from.currency));
  });

  it('auto-selects nested populated paths even with an inclusion projection', async function() {
    const result = await Order.findById(order._id).populate({
      path: 'route', model: Route, select: 'from.label',
      populate: { path: 'from.currency', model: Currency, select: 'symbol' }
    }).lean();
    assert.strictEqual(result.route.from.label, 'Origin');
    assert.strictEqual(result.route.from.currency.symbol, 'INR');
  });

  it('uses the last options for repeated population of the same path', async function() {
    const result = await Order.findById(order._id)
      .populate({ path: 'route', model: Route, populate: { path: 'from.currency', model: Currency } })
      .populate({ path: 'route', model: Route });
    assert.ok(result.route.from.currency instanceof Types.ObjectId);
  });

  it('returns the transform result, including for missing documents', async function() {
    const dangling = await Order.create({ route: new Types.ObjectId() });
    const result = await Order.findById(dangling._id).populate({ path: 'route', model: Route, transform: () => 'missing' }).lean();
    assert.strictEqual(result.route, 'missing');
  });

  it('preserves null query results and rejects missing documents with orFail', async function() {
    const query = () => Order.findById(new Types.ObjectId()).populate({ path: 'route', model: Route });
    assert.strictEqual(await query().lean(), null);
    await assert.rejects(query().orFail(), mongoose.Error.DocumentNotFoundError);
  });
});
