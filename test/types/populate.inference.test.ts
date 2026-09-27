import { model, Schema, Types, PopulateOptions } from 'mongoose';
import { expect } from 'tstyche';

interface Currency {
  _id: Types.ObjectId;
  name: string;
  symbol: string;
}
interface Route {
  _id: Types.ObjectId;
  from: { currency: Types.ObjectId; label: string };
  currencies: Types.ObjectId[];
}
interface Order {
  route: Types.ObjectId;
  optionalRoute?: Types.ObjectId;
  routes: Types.ObjectId[];
  stops: { route: Types.ObjectId; label: string }[];
  name: string;
}

const CurrencyModel = model<Currency>('InferenceCurrency', new Schema<Currency>({ name: String, symbol: String }));
const RouteModel = model<Route>('InferenceRoute', new Schema<Route>({
  from: { currency: Schema.Types.ObjectId, label: String },
  currencies: [Schema.Types.ObjectId]
}));
const OrderModel = model<Order>('InferenceOrder', new Schema<Order>({
  route: Schema.Types.ObjectId,
  optionalRoute: Schema.Types.ObjectId,
  routes: [Schema.Types.ObjectId],
  stops: [{ route: Schema.Types.ObjectId, label: String }],
  name: String
}));

async function nestedPopulation() {
  const result = await OrderModel.findOne().populate({
    model: RouteModel,
    path: 'route',
    populate: [{ model: CurrencyModel, path: 'from.currency', select: 'symbol' }]
  }).lean();
  expect(result?.route?.from.currency?.symbol).type.toBe<string | undefined>();
  expect(result?.route?.from.currency?._id).type.toBe<Types.ObjectId | undefined>();
  expect(result?.route?.from.label).type.toBe<string | undefined>();
  // @ts-expect-error does not exist on type
  result?.route?.from.currency?.name;
  // @ts-expect-error does not exist on type
  result?.route?.save();

  const before = await OrderModel.findOne().lean().populate({ path: 'route', model: RouteModel });
  expect(before?.route?.from.currency).type.toBe<Types.ObjectId | undefined>();
  // @ts-expect-error does not exist on type
  before?.route?.save();
}

async function hydratedPopulation() {
  const result = await OrderModel.findOne().populate({ path: 'route', model: RouteModel }).orFail();
  result.save();
  result.route?.save();
  expect(result.route?.from.label).type.toBe<string | undefined>();
  expect(result.toObject().route?.from.label).type.toBe<string | undefined>();
  // @ts-expect-error does not exist on type
  result.toObject().route?.save();

  const customSchema = new Schema<Currency, any, { display(): string }>({ name: String, symbol: String });
  customSchema.method('display', function() { return this.symbol; });
  const CustomCurrency = model('InferenceCustomCurrency', customSchema);
  const custom = await RouteModel.findOne().populate({ path: 'from.currency', model: CustomCurrency });
  expect(custom?.from.currency?.display()).type.toBe<string | undefined>();
}

async function arraysAndOptionalPaths() {
  const results = await OrderModel.find().populate([
    { path: 'routes', model: RouteModel },
    { path: 'optionalRoute', model: RouteModel },
    { path: 'stops.route', model: RouteModel }
  ]).lean();
  expect(results[0].routes[0].from.label).type.toBe<string>();
  expect(results[0].optionalRoute?.from.label).type.toBe<string | undefined>();
  expect(results[0].stops[0].route?.from.label).type.toBe<string | undefined>();
  expect(results[0].stops[0].label).type.toBe<string>();
  // @ts-expect-error does not exist on type
  results[0].routes[0].toHexString();

  const retained = await OrderModel.findOne().populate({ path: 'routes', model: RouteModel, retainNullValues: true }).lean();
  expect(retained?.routes[0]?.from.label).type.toBe<string | undefined>();
}

async function selectionsAndChaining() {
  const selected = await RouteModel.findOne().populate({ path: 'from.currency', model: CurrencyModel, select: 'symbol -_id' }).lean();
  expect(selected?.from.currency?.symbol).type.toBe<string | undefined>();
  // @ts-expect-error does not exist on type
  selected?.from.currency?._id;

  const excluded = await RouteModel.findOne().populate({ path: 'from.currency', model: CurrencyModel, select: '-name' }).lean();
  expect(excluded?.from.currency?.symbol).type.toBe<string | undefined>();
  // @ts-expect-error does not exist on type
  excluded?.from.currency?.name;

  const object = await RouteModel.findOne().populate({ path: 'from.currency', model: CurrencyModel, select: { symbol: 1, _id: 0 } }).lean();
  expect(object?.from.currency?.symbol).type.toBe<string | undefined>();
  // @ts-expect-error does not exist on type
  object?.from.currency?.name;

  const chained = await OrderModel.findOne().populate({ path: 'route', model: RouteModel })
    .populate({ path: 'optionalRoute', model: RouteModel }).lean();
  expect(chained?.route?.from.label).type.toBe<string | undefined>();
  expect(chained?.optionalRoute?.from.label).type.toBe<string | undefined>();
}

async function compatibility(options: PopulateOptions, path: string, selection: string) {
  const explicit = await OrderModel.findOne().populate<{ route: Route }>({ path: 'route', model: RouteModel });
  expect(explicit?.route.from.label).type.toBe<string | undefined>();
  const fallback = await OrderModel.findOne().populate(options);
  expect(fallback?.route).type.toBe<Types.ObjectId | undefined>();
  const dynamic = await OrderModel.findOne().populate({ path, model: RouteModel });
  expect(dynamic?.route).type.toBe<Types.ObjectId | undefined>();
  const selected = await RouteModel.findOne().populate({ path: 'from.currency', model: CurrencyModel, select: selection }).lean();
  expect(selected?.from.currency?.name).type.toBe<string | undefined>();
  const count = await OrderModel.countDocuments().populate({ path: 'route', model: RouteModel });
  expect(count).type.toBe<number>();
}

async function advancedOptions() {
  const WithSubdocuments = model('InferenceSubdocuments', new Schema({
    route: Schema.Types.ObjectId,
    items: [{ name: String }]
  }));
  const preserved = await WithSubdocuments.findOne().populate({ path: 'route', model: RouteModel });
  preserved?.items.id(new Types.ObjectId());
  preserved?.items[0].ownerDocument();
  const dotted = await OrderModel.findOne().populate({ path: 'route', model: RouteModel, select: 'from.label' }).lean();
  expect(dotted?.route?.from.label).type.toBe<string | undefined>();
  // @ts-expect-error does not exist on type
  dotted?.route?.from.currency;
  const omitted = await OrderModel.findOne().populate({ path: 'route', model: RouteModel, select: '-from.currency' }).lean();
  expect(omitted?.route?.from.label).type.toBe<string | undefined>();
  // @ts-expect-error does not exist on type
  omitted?.route?.from.currency;

  const hydrated = await RouteModel.findOne().populate({ path: 'from.currency', model: CurrencyModel, select: 'symbol -_id' });
  hydrated?.from.currency?.save();
  // @ts-expect-error does not exist on type
  hydrated?.from.currency?.name;
  // @ts-expect-error does not exist on type
  hydrated?.from.currency?._id;

  const nested = await OrderModel.findOne().populate({ path: 'route', model: RouteModel, populate: { path: 'from.currency', model: CurrencyModel } });
  nested?.route?.from.currency?.save();
  expect(nested?.route?.toObject().from.currency?.symbol).type.toBe<string | undefined>();
  // @ts-expect-error does not exist on type
  nested?.route?.toObject().from.currency?.save();

  const localLean = await OrderModel.findOne().populate({ path: 'route', model: RouteModel, options: { lean: true } });
  localLean?.save();
  // @ts-expect-error does not exist on type
  localLean?.route?.save();
  const localLeanNested = await OrderModel.findOne().populate({
    path: 'route', model: RouteModel, options: { lean: true },
    populate: { path: 'from.currency', model: CurrencyModel }
  });
  expect(localLeanNested?.route?.from.currency?.symbol).type.toBe<string | undefined>();
  // @ts-expect-error does not exist on type
  localLeanNested?.route?.from.currency?.save();
  const arraySelection = await RouteModel.findOne().populate({ path: 'from.currency', model: CurrencyModel, select: ['symbol', '-_id'] }).lean();
  expect(arraySelection?.from.currency?.symbol).type.toBe<string | undefined>();
  // @ts-expect-error does not exist on type
  arraySelection?.from.currency?._id;
  const one = await OrderModel.findOne().populate({ path: 'routes', model: RouteModel, justOne: true }).lean();
  expect(one?.routes?.from.label).type.toBe<string | undefined>();
  const many = await OrderModel.findOne().populate({ path: 'route', model: RouteModel, justOne: false }).lean();
  expect(many?.route[0].from.label).type.toBe<string | undefined>();
  const transformed = await OrderModel.findOne().populate({ path: 'route', model: RouteModel, transform: () => 'transformed' as const }).lean();
  expect(transformed?.route).type.toBe<'transformed' | null | undefined>();
  const depopulated = nested?.toObject({ depopulate: true });
  expect(depopulated?.route).type.toBe<Types.ObjectId | undefined>();
}

async function longOptionLists() {
  interface References {
    a: Types.ObjectId;
    b: Types.ObjectId;
    c: Types.ObjectId;
    d: Types.ObjectId;
    e: Types.ObjectId;
    f: Types.ObjectId;
  }
  const ReferencesModel = model<References>('InferenceReferences', new Schema<References>({
    a: Schema.Types.ObjectId, b: Schema.Types.ObjectId, c: Schema.Types.ObjectId,
    d: Schema.Types.ObjectId, e: Schema.Types.ObjectId, f: Schema.Types.ObjectId
  }));
  const result = await ReferencesModel.findOne().populate([
    { path: 'a', model: CurrencyModel },
    { path: 'b', model: CurrencyModel },
    { path: 'c', model: CurrencyModel },
    { path: 'd', model: CurrencyModel },
    { path: 'e', model: CurrencyModel },
    { path: 'f', model: CurrencyModel }
  ]).lean();
  expect(result?.a?.symbol).type.toBe<string | undefined>();
  expect(result?.f?.symbol).type.toBe<string | undefined>();
}

void nestedPopulation;
void hydratedPopulation;
void arraysAndOptionalPaths;
void selectionsAndChaining;
void compatibility;
void advancedOptions;
void longOptionLists;

async function reviewRegressions() {
  const chained = await OrderModel.findOne()
    .populate({ path: 'route', model: RouteModel })
    .populate({ path: 'optionalRoute', model: RouteModel });
  chained?.route?.save();
  chained?.optionalRoute?.save();
  expect(chained?.toObject({ depopulate: true }).route).type.toBe<Types.ObjectId | undefined>();

  // A user-supplied Paths generic can itself have a path property.
  const explicit = await OrderModel.findOne().populate<{ path: string }>({ path: 'route', model: RouteModel });
  expect(explicit?.path).type.toBe<string | undefined>();

  const mixed = await OrderModel.findOne().lean().populate({ path: 'route', model: RouteModel, options: { lean: false } });
  mixed?.route?.save();
  const mixedAfter = await OrderModel.findOne().populate({ path: 'route', model: RouteModel, options: { lean: false } }).lean();
  mixedAfter?.route?.save();
  const hydratedAgain = await OrderModel.findOne().populate({ path: 'route', model: RouteModel }).lean(false);
  hydratedAgain?.route?.save();
  const leanThenHydrated = await OrderModel.findOne().lean().populate({ path: 'route', model: RouteModel }).lean(false);
  leanThenHydrated?.route?.save();

  const selectedParent = await OrderModel.findOne().populate({
    path: 'route', model: RouteModel, select: 'from.label',
    populate: { path: 'from.currency', model: CurrencyModel, select: 'symbol' }
  }).lean();
  expect(selectedParent?.route?.from.currency?.symbol).type.toBe<string | undefined>();

  const plus = await RouteModel.findOne().populate({ path: 'from.currency', model: CurrencyModel, select: ['+symbol'] }).lean();
  expect(plus?.from.currency?.name).type.toBe<string | undefined>();
}

void reviewRegressions;

async function runtimeDependentOptions(flag: boolean) {
  const retained = await OrderModel.findOne().populate({ path: 'routes', model: RouteModel, retainNullValues: flag }).lean().orFail();
  // @ts-expect-error possibly 'null' or 'undefined'
  retained.routes[0].from.label;
  const cardinality = await OrderModel.findOne().populate({ path: 'route', model: RouteModel, justOne: flag }).lean().orFail();
  if (Array.isArray(cardinality.route)) {
    expect(cardinality.route[0].from.label).type.toBe<string>();
  } else {
    expect(cardinality.route?.from.label).type.toBe<string | undefined>();
  }
  const mixed = await OrderModel.findOne().populate({ path: 'route', model: RouteModel, options: { lean: flag } });
  // @ts-expect-error does not exist on type
  mixed?.route?.save();

  const InferredOrder = model('InferenceArrayOwner', new Schema({ stops: [{ route: Schema.Types.ObjectId, label: String }] }));
  const nested = await InferredOrder.findOne().populate({ path: 'stops.route', model: RouteModel });
  nested?.stops.id(new Types.ObjectId())?.route?.save();
  nested?.stops[0].ownerDocument();

  const StringId = model('InferenceStringId', new Schema({ _id: { type: String, required: true }, symbol: { type: String, required: true } }));
  const stringId = await OrderModel.findOne().populate({ path: 'route', model: StringId }).lean();
  expect(stringId?.route?._id).type.toBe<string | undefined>();
  const findById = await OrderModel.findById(new Types.ObjectId()).populate({ path: 'route', model: RouteModel });
  findById?.route?.save();
  const updated = await OrderModel.findOneAndUpdate({}, { name: 'Updated' }).populate({ path: 'route', model: RouteModel });
  updated?.route?.save();
  const cursor = OrderModel.find().populate({ path: 'route', model: RouteModel }).cursor();
  (await cursor.next())?.route?.save();
}

void runtimeDependentOptions;
