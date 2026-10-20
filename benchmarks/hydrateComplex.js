'use strict';

// Measures the cost of hydrating a document that contains several document
// arrays. `HydrateWithoutDocumentArrays` has the same top-level scalar paths
// as `HydrateWithDocumentArrays`, so the difference isolates document-array
// casting rather than query or database time.

const mongoose = require('../');

const iterations = Number(process.env.MONGOOSE_BENCHMARK_ITERATIONS) || 10000;
const samples = Number(process.env.MONGOOSE_BENCHMARK_SAMPLES) || 5;
const warmupIterations = Number(process.env.MONGOOSE_BENCHMARK_WARMUP_ITERATIONS) || 1000;

const crewMemberSchema = new mongoose.Schema({
  memberId: mongoose.Schema.Types.ObjectId,
  roles: [String]
}, { _id: false });

const chargeSchema = new mongoose.Schema({
  kind: String,
  amount: Number,
  chargedAt: Date,
  notes: String
}, { _id: false });

const photoSchema = new mongoose.Schema({
  url: String,
  takenAt: Date,
  caption: String
}, { _id: false });

const scalarPaths = {
  status: String,
  travelerId: mongoose.Schema.Types.ObjectId,
  hostId: mongoose.Schema.Types.ObjectId,
  craftId: mongoose.Schema.Types.ObjectId,
  startsAt: Date,
  endsAt: Date,
  timezone: String,
  weeklyRate: Number,
  depositAmount: Number,
  amountCharged: Number,
  isFirstExpedition: Boolean,
  hasSignedWaiver: Boolean,
  licenseNumber: String,
  hostEmail: String,
  region: String
};

const HydrateWithoutDocumentArrays = mongoose.model(
  'HydrateWithoutDocumentArrays',
  new mongoose.Schema(scalarPaths)
);
const HydrateWithDocumentArrays = mongoose.model(
  'HydrateWithDocumentArrays',
  new mongoose.Schema({
    ...scalarPaths,
    crew: [crewMemberSchema],
    charges: [chargeSchema],
    hostCharges: [chargeSchema],
    departurePhotos: [photoSchema],
    returnPhotos: [photoSchema]
  })
);

const now = new Date('2025-06-01T00:00:00.000Z');
const rawDoc = {
  _id: new mongoose.Types.ObjectId(),
  status: 'underway',
  travelerId: new mongoose.Types.ObjectId(),
  hostId: new mongoose.Types.ObjectId(),
  craftId: new mongoose.Types.ObjectId(),
  startsAt: now,
  endsAt: now,
  timezone: 'America/Chicago',
  weeklyRate: 450,
  depositAmount: 250,
  amountCharged: 450,
  isFirstExpedition: false,
  hasSignedWaiver: true,
  licenseNumber: '1234567890',
  hostEmail: 'host@example.com',
  region: 'dallas',
  crew: [{
    memberId: new mongoose.Types.ObjectId(),
    roles: ['captain', 'host']
  }],
  charges: [{
    kind: 'fare',
    amount: 450,
    chargedAt: now,
    notes: 'Weekly charge'
  }],
  hostCharges: [{
    kind: 'fee',
    amount: 25,
    chargedAt: now
  }],
  departurePhotos: [{
    url: 'https://example.com/departure.jpg',
    takenAt: now,
    caption: 'Departure'
  }],
  returnPhotos: [{
    url: 'https://example.com/return.jpg',
    takenAt: now,
    caption: 'Return'
  }]
};

function measure(Model, count) {
  let result = 0;
  const start = process.hrtime.bigint();

  for (let i = 0; i < count; ++i) {
    // Reading a shared scalar keeps the hydrated document observable without
    // adding work to only the document-array variant.
    result += Model.hydrate(rawDoc).status.length;
  }

  if (result < 0) {
    throw new Error('Unexpected benchmark result');
  }

  return Number(process.hrtime.bigint() - start) / 1e6;
}

function median(values) {
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}

for (let i = 0; i < warmupIterations; ++i) {
  HydrateWithoutDocumentArrays.hydrate(rawDoc);
  HydrateWithDocumentArrays.hydrate(rawDoc);
}

const withoutDocumentArrays = median(
  Array.from({ length: samples }, () => measure(HydrateWithoutDocumentArrays, iterations))
);
const withDocumentArrays = median(
  Array.from({ length: samples }, () => measure(HydrateWithDocumentArrays, iterations))
);
const documentArrayOverhead = withDocumentArrays - withoutDocumentArrays;

console.log(JSON.stringify({
  iterations,
  samples,
  'hydrate without document arrays ms/document': +(withoutDocumentArrays / iterations).toFixed(6),
  'hydrate with document arrays ms/document': +(withDocumentArrays / iterations).toFixed(6),
  'document-array casting overhead ms/document': +(documentArrayOverhead / iterations).toFixed(6),
  'document-array casting overhead ratio': +(withDocumentArrays / withoutDocumentArrays).toFixed(2)
}, null, 2));
