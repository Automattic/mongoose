'use strict';
const assert = require('assert');
const start = require('../common.js');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;

const {
  getRelatedDBIndexes,
  getRelatedSchemaIndexes
} = require('../../lib/helpers/indexes/getRelatedIndexes.js');


describe('getRelatedIndexes', () => {
  let db;
  before(() => db = start());
  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('../util').clearTestData(db));
  afterEach(() => require('../util').stopRemainingOps(db));
  after(() => db.close());

  describe('getRelatedSchemaIndexes', () => {
    it('with base model, no discriminator, it gets all indexes', () => {
      // Arrange
      const eventSchema = new Schema({ actorId: { type: Schema.Types.ObjectId }, happenedAt: Date });
      eventSchema.index({ actorId: 1 }, { unique: true });
      eventSchema.index({ happenedAt: 1 }, { partialFilterExpression: { __t: 'EventButNoDiscriminator' } });
      const Event = db.model('Event', eventSchema);

      // Act
      const filteredSchemaIndexes = getRelatedSchemaIndexes(Event, Event.schema.indexes());

      // Assert
      assert.deepStrictEqual(
        filteredSchemaIndexes,
        [
          [{ actorId: 1 }, { background: true, unique: true }],
          [
            { happenedAt: 1 },
            { background: true, partialFilterExpression: { __t: 'EventButNoDiscriminator' } }
          ]
        ]
      );
    });
    it('with base model that has discriminator, it ignores discriminator indexes', () => {
      // Arrange
      const eventSchema = new Schema(
        { actorId: { type: Schema.Types.ObjectId } },
        { autoIndex: false }
      );
      eventSchema.index({ actorId: 1 }, { unique: true });

      const Event = db.model('Event', eventSchema);

      const clickEventSchema = new Schema(
        {
          clickedAt: Date,
          productCategory: String
        },
        { autoIndex: false }
      );
      clickEventSchema.index(
        { clickedAt: 1 },
        { partialFilterExpression: { productCategory: 'Computers' } }
      );
      Event.discriminator('ClickEvent', clickEventSchema);

      const buyEventSchema = new Schema(
        {
          boughtAt: String,
          productPrice: Number
        },
        { autoIndex: false }
      );
      buyEventSchema.index(
        { boughtAt: 1 },
        {
          unique: true,
          partialFilterExpression: { productPrice: { $gt: 100 } }
        }
      );
      Event.discriminator('BuyEvent', buyEventSchema);


      // Act
      const filteredSchemaIndexes = getRelatedSchemaIndexes(Event, Event.schema.indexes());

      // Assert
      assert.deepStrictEqual(
        filteredSchemaIndexes,
        [
          [{ actorId: 1 }, { background: true, unique: true }]
        ]
      );
    });
    it('with discriminator model, it only gets discriminator indexes', () => {
      // Arrange
      const eventSchema = new Schema(
        { actorId: { type: Schema.Types.ObjectId } },
        { autoIndex: false }
      );
      eventSchema.index({ actorId: 1 }, { unique: true });

      const Event = db.model('Event', eventSchema);

      const clickEventSchema = new Schema(
        {
          clickedAt: Date,
          productCategory: String
        },
        { autoIndex: false }
      );
      clickEventSchema.index(
        { clickedAt: 1 },
        { partialFilterExpression: { productCategory: 'Computers' } }
      );
      Event.discriminator('ClickEvent', clickEventSchema);

      const buyEventSchema = new Schema(
        {
          boughtAt: String,
          productPrice: Number
        },
        { autoIndex: false }
      );
      buyEventSchema.index(
        { boughtAt: 1 },
        {
          unique: true,
          partialFilterExpression: { productPrice: { $gt: 100 } }
        }
      );
      const BuyEvent = Event.discriminator('BuyEvent', buyEventSchema);


      // Act
      const filteredSchemaIndexes = getRelatedSchemaIndexes(BuyEvent, BuyEvent.schema.indexes());

      // Assert
      assert.deepStrictEqual(
        filteredSchemaIndexes,
        [
          [
            { boughtAt: 1 },
            {
              background: true,
              unique: true,
              partialFilterExpression: {
                __t: 'BuyEvent',
                productPrice: { $gt: 100 }
              }
            }
          ]
        ]
      );
    });
  });
  describe('getRelatedDBIndexes', () => {
    it('with base model, no discriminator, it gets all indexes', () => {
      // Arrange
      const eventSchema = new Schema();
      const Event = db.model('Event', eventSchema);

      const dbIndexes = [
        { v: 2, key: { _id: 1 }, name: '_id_', ns: 'mongoose_test.some_collection' },
        {
          v: 2,
          unique: true,
          key: { actorId: 1 },
          name: 'actorId_1',
          ns: 'mongoose_test.some_collection',
          background: true
        },
        {
          v: 2,
          unique: true,
          key: { doesNotMatter: 1 },
          name: 'doesNotMatter_1',
          ns: 'mongoose_test.some_collection',
          partialFilterExpression: { __t: 'EventButNoDiscriminator' },
          background: true
        }
      ];

      // Act
      const filteredDBIndexes = getRelatedDBIndexes(Event, dbIndexes);

      // Assert
      assert.deepStrictEqual(
        filteredDBIndexes,
        [
          { v: 2, key: { _id: 1 }, name: '_id_', ns: 'mongoose_test.some_collection' },
          {
            v: 2,
            unique: true,
            key: { actorId: 1 },
            name: 'actorId_1',
            ns: 'mongoose_test.some_collection',
            background: true
          },
          {
            v: 2,
            unique: true,
            key: { doesNotMatter: 1 },
            name: 'doesNotMatter_1',
            ns: 'mongoose_test.some_collection',
            partialFilterExpression: { __t: 'EventButNoDiscriminator' },
            background: true
          }
        ]
      );
    });
    it('with base model that has discriminator, it ignores discriminator indexes', () => {
      // Arrange
      const eventSchema = new Schema(
        { actorId: { type: Schema.Types.ObjectId } },
        { autoIndex: false }
      );
      eventSchema.index({ actorId: 1 }, { unique: true });

      const Event = db.model('Event', eventSchema);

      const clickEventSchema = new Schema(
        {
          clickedAt: Date,
          productCategory: String
        },
        { autoIndex: false }
      );
      clickEventSchema.index(
        { clickedAt: 1 },
        { partialFilterExpression: { productCategory: 'Computers' } }
      );
      Event.discriminator('ClickEvent', clickEventSchema);

      const buyEventSchema = new Schema(
        {
          boughtAt: String,
          productPrice: Number
        },
        { autoIndex: false }
      );
      buyEventSchema.index(
        { boughtAt: 1 },
        {
          unique: true,
          partialFilterExpression: { productPrice: { $gt: 100 } }
        }
      );
      Event.discriminator('BuyEvent', buyEventSchema);


      const dbIndexes = [
        { v: 2, key: { _id: 1 }, name: '_id_', ns: 'mongoose_test.some_collection' },
        {
          v: 2,
          unique: true,
          key: { actorId: 1 },
          name: 'actorId_1',
          ns: 'mongoose_test.some_collection',
          background: true
        },
        {
          unique: true,
          key: { boughtAt: 1 },
          name: 'boughtAt_1',
          ns: 'mongoose_test.some_collection',
          partialFilterExpression: { __t: 'BuyEvent' },
          background: true
        },
        {
          unique: true,
          key: { clickedAt: 1 },
          name: 'clickedAt_1',
          ns: 'mongoose_test.some_collection',
          partialFilterExpression: { __t: 'ClickEvent' },
          background: true
        }
      ];

      // Act
      const filteredDBIndexes = getRelatedDBIndexes(Event, dbIndexes);

      // Assert
      assert.deepStrictEqual(
        filteredDBIndexes,
        [
          { v: 2, key: { _id: 1 }, name: '_id_', ns: 'mongoose_test.some_collection' },
          {
            v: 2,
            unique: true,
            key: { actorId: 1 },
            name: 'actorId_1',
            ns: 'mongoose_test.some_collection',
            background: true
          }
        ]
      );
    });
    it('with discriminator model, it only gets discriminator indexes', () => {
      // Arrange
      const eventSchema = new Schema(
        { actorId: { type: Schema.Types.ObjectId } },
        { autoIndex: false }
      );
      eventSchema.index({ actorId: 1 }, { unique: true });

      const Event = db.model('Event', eventSchema);

      const clickEventSchema = new Schema(
        {
          clickedAt: Date,
          productCategory: String
        },
        { autoIndex: false }
      );
      clickEventSchema.index(
        { clickedAt: 1 },
        { partialFilterExpression: { productCategory: 'Computers' } }
      );
      Event.discriminator('ClickEvent', clickEventSchema);

      const buyEventSchema = new Schema(
        {
          boughtAt: String,
          productPrice: Number
        },
        { autoIndex: false }
      );
      buyEventSchema.index(
        { boughtAt: 1 },
        {
          unique: true,
          partialFilterExpression: { productPrice: { $gt: 100 } }
        }
      );
      const BuyEvent = Event.discriminator('BuyEvent', buyEventSchema);


      const dbIndexes = [
        { v: 2, key: { _id: 1 }, name: '_id_', ns: 'mongoose_test.some_collection' },
        {
          v: 2,
          unique: true,
          key: { actorId: 1 },
          name: 'actorId_1',
          ns: 'mongoose_test.some_collection',
          background: true
        },
        {
          unique: true,
          key: { boughtAt: 1 },
          name: 'boughtAt_1',
          ns: 'mongoose_test.some_collection',
          partialFilterExpression: { __t: 'BuyEvent' },
          background: true
        },
        {
          unique: true,
          key: { clickedAt: 1 },
          name: 'clickedAt_1',
          ns: 'mongoose_test.some_collection',
          partialFilterExpression: { __t: 'ClickEvent' },
          background: true
        }
      ];

      // Act
      const filteredDBIndexes = getRelatedDBIndexes(BuyEvent, dbIndexes);

      // Assert
      assert.deepStrictEqual(
        filteredDBIndexes,
        [
          {
            unique: true,
            key: { boughtAt: 1 },
            name: 'boughtAt_1',
            ns: 'mongoose_test.some_collection',
            partialFilterExpression: { __t: 'BuyEvent' },
            background: true
          }
        ]
      );
    });
  });
});
