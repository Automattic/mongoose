'use strict';

const getDiscriminatorByValue = require('../../helpers/discriminator/getDiscriminatorByValue');
const applyTimestampsToChildren = require('../update/applyTimestampsToChildren');
const applyTimestampsToUpdate = require('../update/applyTimestampsToUpdate');
const cast = require('../../cast');
const castUpdate = require('../query/castUpdate');
const setDefaultsOnInsert = require('../setDefaultsOnInsert');

/*!
 * Given a model and a bulkWrite op, return a thunk that handles casting and
 * validating the individual op.
 */

module.exports = function castBulkWrite(originalModel, op, options) {
  const now = originalModel.base.now();

  if (op['insertOne']) {
    return (callback) => {
      const model = decideModelByObject(originalModel, op['insertOne']['document']);

      const doc = new model(op['insertOne']['document']);
      if (model.schema.options.timestamps) {
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
    return (callback) => {
      try {
        if (!op['updateOne']['filter']) {
          throw new Error('Must provide a filter object.');
        }
        if (!op['updateOne']['update']) {
          throw new Error('Must provide an update object.');
        }

        const model = decideModelByObject(originalModel, op['updateOne']['filter']);
        const schema = model.schema;
        const strict = options.strict != null ? options.strict : model.schema.options.strict;

        _addDiscriminatorToObject(schema, op['updateOne']['filter']);

        if (model.schema.$timestamps != null && op['updateOne'].timestamps !== false) {
          const createdAt = model.schema.$timestamps.createdAt;
          const updatedAt = model.schema.$timestamps.updatedAt;
          applyTimestampsToUpdate(now, createdAt, updatedAt, op['updateOne']['update'], {});
        }

        applyTimestampsToChildren(now, op['updateOne']['update'], model.schema);

        if (op['updateOne'].setDefaultsOnInsert) {
          setDefaultsOnInsert(op['updateOne']['filter'], model.schema, op['updateOne']['update'], {
            setDefaultsOnInsert: true,
            upsert: op['updateOne'].upsert
          });
        }

        op['updateOne']['filter'] = cast(model.schema, op['updateOne']['filter'], {
          strict: strict,
          upsert: op['updateOne'].upsert
        });

        op['updateOne']['update'] = castUpdate(model.schema, op['updateOne']['update'], {
          strict: strict,
          overwrite: false,
          upsert: op['updateOne'].upsert
        }, model, op['updateOne']['filter']);
      } catch (error) {
        return callback(error, null);
      }

      callback(null);
    };
  } else if (op['updateMany']) {
    return (callback) => {
      try {
        if (!op['updateMany']['filter']) {
          throw new Error('Must provide a filter object.');
        }
        if (!op['updateMany']['update']) {
          throw new Error('Must provide an update object.');
        }

        const model = decideModelByObject(originalModel, op['updateMany']['filter']);
        const schema = model.schema;
        const strict = options.strict != null ? options.strict : model.schema.options.strict;

        if (op['updateMany'].setDefaultsOnInsert) {
          setDefaultsOnInsert(op['updateMany']['filter'], model.schema, op['updateMany']['update'], {
            setDefaultsOnInsert: true,
            upsert: op['updateMany'].upsert
          });
        }

        if (model.schema.$timestamps != null && op['updateMany'].timestamps !== false) {
          const createdAt = model.schema.$timestamps.createdAt;
          const updatedAt = model.schema.$timestamps.updatedAt;
          applyTimestampsToUpdate(now, createdAt, updatedAt, op['updateMany']['update'], {});
        }

        applyTimestampsToChildren(now, op['updateMany']['update'], model.schema);

        _addDiscriminatorToObject(schema, op['updateMany']['filter']);

        op['updateMany']['filter'] = cast(model.schema, op['updateMany']['filter'], {
          strict: strict,
          upsert: op['updateMany'].upsert
        });

        op['updateMany']['update'] = castUpdate(model.schema, op['updateMany']['update'], {
          strict: strict,
          overwrite: false,
          upsert: op['updateMany'].upsert
        }, model, op['updateMany']['filter']);

      } catch (error) {
        return callback(error, null);
      }

      callback(null);
    };
  } else if (op['replaceOne']) {
    return (callback) => {
      const model = decideModelByObject(originalModel, op['replaceOne']['filter']);
      const schema = model.schema;
      const strict = options.strict != null ? options.strict : model.schema.options.strict;

      _addDiscriminatorToObject(schema, op['replaceOne']['filter']);
      try {
        op['replaceOne']['filter'] = cast(model.schema, op['replaceOne']['filter'], {
          strict: strict,
          upsert: op['replaceOne'].upsert
        });
      } catch (error) {
        return callback(error, null);
      }

      // set `skipId`, otherwise we get "_id field cannot be changed"
      const doc = new model(op['replaceOne']['replacement'], strict, true);
      if (model.schema.options.timestamps) {
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
        op['replaceOne']['replacement'] = op['replaceOne']['replacement'].toBSON();
        callback(null);
      });
    };
  } else if (op['deleteOne']) {
    return (callback) => {
      const model = decideModelByObject(originalModel, op['deleteOne']['filter']);
      const schema = model.schema;

      _addDiscriminatorToObject(schema, op['deleteOne']['filter']);

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
      const model = decideModelByObject(originalModel, op['deleteMany']['filter']);
      const schema = model.schema;

      _addDiscriminatorToObject(schema, op['deleteMany']['filter']);

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

function _addDiscriminatorToObject(schema, obj) {
  if (schema == null) {
    return;
  }
  if (schema.discriminatorMapping && !schema.discriminatorMapping.isRoot) {
    obj[schema.discriminatorMapping.key] = schema.discriminatorMapping.value;
  }
}

/*!
 * gets discriminator model if discriminator key is present in object
 */

function decideModelByObject(model, object) {
  const discriminatorKey = model.schema.options.discriminatorKey;
  if (object != null && object.hasOwnProperty(discriminatorKey)) {
    model = getDiscriminatorByValue(model, object[discriminatorKey]) || model;
  }
  return model;
}
