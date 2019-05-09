'use strict';

const applyTimestampsToChildren = require('../update/applyTimestampsToChildren');
const applyTimestampsToUpdate = require('../update/applyTimestampsToUpdate');
const cast = require('../../cast');
const castUpdate = require('../query/castUpdate');
const setDefaultsOnInsert = require('../setDefaultsOnInsert');

/*!
 * Given a model and a bulkWrite op, return a thunk that handles casting and
 * validating the individual op.
 */

module.exports = function castBulkWrite(model, op, options) {
  const now = model.base.now();
  if (op['insertOne']) {
    return (callback) => {
      const doc = new model(op['insertOne']['document']);
      if (model.schema.options.timestamps != null) {
        doc.initializeTimestamps();
      }
      if (options.session != null) {
        doc.$session(options.session);
      }
      op['insertOne']['document'] = doc;
      op['insertOne']['document'].validate({ __noPromise: true }, function(error) {
        if (error) {
          return callback(error, null);
        }
        callback(null);
      });
    };
  } else if (op['updateOne']) {
    op = op['updateOne'];
    return (callback) => {
      try {
        op['filter'] = cast(model.schema, op['filter']);
        op['update'] = castUpdate(model.schema, op['update'], {
          strict: model.schema.options.strict,
          overwrite: false
        });
        if (op.setDefaultsOnInsert) {
          setDefaultsOnInsert(op['filter'], model.schema, op['update'], {
            setDefaultsOnInsert: true,
            upsert: op.upsert
          });
        }
        if (model.schema.$timestamps != null) {
          const createdAt = model.schema.$timestamps.createdAt;
          const updatedAt = model.schema.$timestamps.updatedAt;
          applyTimestampsToUpdate(now, createdAt, updatedAt, op['update'], {});
        }
        applyTimestampsToChildren(now, op['update'], model.schema);
      } catch (error) {
        return callback(error, null);
      }

      callback(null);
    };
  } else if (op['updateMany']) {
    op = op['updateMany'];
    return (callback) => {
      try {
        op['filter'] = cast(model.schema, op['filter']);
        op['update'] = castUpdate(model.schema, op['update'], {
          strict: model.schema.options.strict,
          overwrite: false
        });
        if (op.setDefaultsOnInsert) {
          setDefaultsOnInsert(op['filter'], model.schema, op['update'], {
            setDefaultsOnInsert: true,
            upsert: op.upsert
          });
        }
        if (model.schema.$timestamps != null) {
          const createdAt = model.schema.$timestamps.createdAt;
          const updatedAt = model.schema.$timestamps.updatedAt;
          applyTimestampsToUpdate(now, createdAt, updatedAt, op['update'], {});
        }
        applyTimestampsToChildren(now, op['update'], model.schema);
      } catch (error) {
        return callback(error, null);
      }

      callback(null);
    };
  } else if (op['replaceOne']) {
    return (callback) => {
      try {
        op['replaceOne']['filter'] = cast(model.schema,
          op['replaceOne']['filter']);
      } catch (error) {
        return callback(error, null);
      }

      // set `skipId`, otherwise we get "_id field cannot be changed"
      const doc = new model(op['replaceOne']['replacement'], null, true);
      if (model.schema.options.timestamps != null) {
        doc.initializeTimestamps();
      }
      if (options.session != null) {
        doc.$session(options.session);
      }
      op['replaceOne']['replacement'] = doc;

      op['replaceOne']['replacement'].validate({ __noPromise: true }, function(error) {
        if (error) {
          return callback(error, null);
        }
        callback(null);
      });
    };
  } else if (op['deleteOne']) {
    return (callback) => {
      try {
        op['deleteOne']['filter'] = cast(model.schema,
          op['deleteOne']['filter']);
      } catch (error) {
        return callback(error, null);
      }

      callback(null);
    };
  } else if (op['deleteMany']) {
    return (callback) => {
      try {
        op['deleteMany']['filter'] = cast(model.schema,
          op['deleteMany']['filter']);
      } catch (error) {
        return callback(error, null);
      }

      callback(null);
    };
  } else {
    return (callback) => {
      callback(new Error('Invalid op passed to `bulkWrite()`'), null);
    };
  }
};