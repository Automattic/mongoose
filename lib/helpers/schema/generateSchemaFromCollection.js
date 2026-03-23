'use strict';

const isBsonType = require('../isBsonType');

/**
 * Samples a collection and infers a Mongoose Schema definition.
 * Essential for bootstrapping models from an existing MongoDB collection.
 * Inspired by Prisma's `db pull`.
 *
 * @param {Connection} conn The Mongoose connection to use.
 * @param {String} collectionName The name of the collection to introspect.
 * @param {Object} [options]
 * @param {Number} [options.sampleSize=100] The number of documents to sample for type inference.
 * @return {Promise<Object>} A plain object representing the inferred Mongoose schema definition.
 */
async function generateSchemaFromCollection(conn, collectionName, options) {
  options = options || {};
  const sampleSize = options.sampleSize || 100;

  const db = conn.db;
  if (!db) {
    throw new Error('Connection is not established. Call `openUri()` first.');
  }
  const collection = db.collection(collectionName);

  // Sample documents to infer structure and types
  const docs = await collection.aggregate([{ $sample: { size: sampleSize } }]).toArray();

  if (docs.length === 0) {
    return {};
  }

  const statsTree = {};

  // Accumulate stats for each path across all sampled documents
  for (const doc of docs) {
    analyze(doc, statsTree);
  }

  // Convert stats into a Mongoose Schema definition object
  const schema = buildSchema(statsTree, docs.length);

  // Remove _id from top-level as Mongoose adds it automatically by default
  delete schema._id;

  return schema;
}

/**
 * Recursively analyzes an object and updates the stats tree.
 * @param {Object} obj The document or sub-document to analyze.
 * @param {Object} stats The current stats tree for the current level.
 * @private
 */
function analyze(obj, stats) {
  if (obj === null || typeof obj !== 'object' || obj._bsontype != null) {
    return;
  }

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === undefined) {
      continue;
    }

    if (!stats[key]) {
      stats[key] = {
        count: 0,
        types: new Set(),
        children: {},
        arrayStats: null
      };
    }

    const s = stats[key];
    s.count++;

    const type = inferType(val);
    if (type !== 'null') {
      s.types.add(type);
    }

    if (type === 'Object') {
      analyze(val, s.children);
    } else if (type === 'Array') {
      if (!s.arrayStats) {
        s.arrayStats = {
          count: 0, // Total number of array elements encountered
          types: new Set(),
          children: {}
        };
      }
      for (const item of val) {
        s.arrayStats.count++;
        const itemType = inferType(item);
        if (itemType !== 'null') {
          s.arrayStats.types.add(itemType);
        }
        if (itemType === 'Object') {
          analyze(item, s.arrayStats.children);
        }
      }
    }
  }
}

/**
 * Infers the logical Mongoose type for a given BSON/JS value.
 * @param {any} val
 * @return {String}
 * @private
 */
function inferType(val) {
  if (val === null) {
    return 'null';
  }
  if (Array.isArray(val)) {
    return 'Array';
  }
  if (isBsonType(val, 'ObjectId')) {
    return 'ObjectId';
  }
  if (isBsonType(val, 'Decimal128')) {
    return 'Decimal128';
  }
  if (isBsonType(val, 'Binary') || Buffer.isBuffer(val)) {
    return 'Buffer';
  }
  if (isBsonType(val, 'Int32') || isBsonType(val, 'Double') || isBsonType(val, 'Long')) {
    return 'Number';
  }
  if (val instanceof Date) {
    return 'Date';
  }
  const typeOf = typeof val;
  if (typeOf === 'string') {
    return 'String';
  }
  if (typeOf === 'number') {
    return 'Number';
  }
  if (typeOf === 'boolean') {
    return 'Boolean';
  }
  if (typeOf === 'object') {
    return 'Object';
  }
  return 'Mixed';
}

/**
 * Builds the schema definition from accumulated stats.
 * @param {Object} stats
 * @param {Number} parentCount
 * @return {Object}
 * @private
 */
function buildSchema(stats, parentCount) {
  const schema = {};

  for (const key of Object.keys(stats)) {
    const s = stats[key];
    const type = pickType(s.types);
    const required = s.count === parentCount;

    if (type === 'Object') {
      const childrenKeys = Object.keys(s.children);
      if (childrenKeys.length > 0) {
        schema[key] = buildSchema(s.children, s.count);
      } else {
        schema[key] = { type: 'Mixed' };
      }
    } else if (type === 'Array') {
      if (s.arrayStats) {
        const itemType = pickType(s.arrayStats.types);
        if (itemType === 'Object') {
          schema[key] = [buildSchema(s.arrayStats.children, s.arrayStats.count)];
        } else {
          schema[key] = [mapTypeToMongoose(itemType)];
        }
      } else {
        // Fallback for empty arrays
        schema[key] = [Object];
      }
    } else {
      schema[key] = { type: mapTypeToMongoose(type) };
      if (required) {
        schema[key].required = true;
      }
    }
  }

  return schema;
}

/**
 * Picks the most appropriate type from a set of encountered types.
 * Simplifies to 'Mixed' if multiple conflicting types are found.
 * @param {Set} types
 * @return {String}
 * @private
 */
function pickType(types) {
  const typesArray = Array.from(types).filter(t => t !== 'null');
  if (typesArray.length === 0) {
    return 'Mixed';
  }
  // If multiple types encountered for the same path, treat as Mixed
  if (typesArray.length > 1) {
    return 'Mixed';
  }
  return typesArray[0];
}

/**
 * Maps logical types to Mongoose Schema configuration strings.
 * @param {String} type
 * @return {String|Object}
 * @private
 */
function mapTypeToMongoose(type) {
  switch (type) {
    case 'String': return 'String';
    case 'Number': return 'Number';
    case 'Boolean': return 'Boolean';
    case 'Date': return 'Date';
    case 'ObjectId': return 'ObjectId';
    case 'Decimal128': return 'Decimal128';
    case 'Buffer': return 'Buffer';
    case 'Mixed': return 'Mixed';
    default: return 'Mixed';
  }
}

module.exports = generateSchemaFromCollection;
