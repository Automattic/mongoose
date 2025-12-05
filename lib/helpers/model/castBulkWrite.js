'use strict';

const MongooseError = require('../../error/mongooseError');
const getDiscriminatorByValue = require('../../helpers/discriminator/getDiscriminatorByValue');
const applyTimestampsToChildren = require('../update/applyTimestampsToChildren');
const applyTimestampsToUpdate = require('../update/applyTimestampsToUpdate');
const cast = require('../../cast');
const castUpdate = require('../query/castUpdate');
const clone = require('../clone');
const decorateUpdateWithVersionKey = require('../update/decorateUpdateWithVersionKey');
const { inspect } = require('util');
const setDefaultsOnInsert = require('../setDefaultsOnInsert');

/**
 * Given a model and a bulkWrite op, return a thunk that handles casting and
 * validating the individual op.
 * @param {Model} originalModel
 * @param {Object} op
 * @param {Object} [options]
 * @api private
 */

module.exports = function castBulkWrite(originalModel, op, options) {
  const now = originalModel.base.now();

  if (op['insertOne']) {
    return callback => module.exports.castInsertOne(originalModel, op['insertOne'], options).then(() => callback(null), err => callback(err));
  } else if (op['updateOne']) {
    return (callback) => {
      try {
        module.exports.castUpdateOne(originalModel, op['updateOne'], options, now);
        callback(null);
      } catch (err) {
        callback(err);
      }
    };
  } else if (op['updateMany']) {
    return (callback) => {
      try {
        module.exports.castUpdateMany(originalModel, op['updateMany'], options, now);
        callback(null);
      } catch (err) {
        callback(err);
      }
    };
  } else if (op['replaceOne']) {
    return (callback) => {
      module.exports.castReplaceOne(originalModel, op['replaceOne'], options).then(() => callback(null), err => callback(err));
    };
  } else if (op['deleteOne']) {
    return (callback) => {
      try {
        module.exports.castDeleteOne(originalModel, op['deleteOne']);
        callback(null);
      } catch (err) {
        callback(err);
      }
    };
  } else if (op['deleteMany']) {
    return (callback) => {
      try {
        module.exports.castDeleteMany(originalModel, op['deleteMany']);
        callback(null);
      } catch (err) {
        callback(err);
      }
    };
  } else {
    return (callback) => {
      const error = new MongooseError(`Invalid op passed to \`bulkWrite()\`: ${inspect(op)}`);
      callback(error, null);
    };
  }
};

module.exports.castInsertOne = async function castInsertOne(originalModel, insertOne, options) {
  const model = decideModelByObject(originalModel, insertOne['document']);

  const doc = new model(insertOne['document']);
  if (model.schema.options.timestamps && getTimestampsOpt(insertOne, options)) {
    doc.initializeTimestamps();
  }
  if (options.session != null) {
    doc.$session(options.session);
  }
  const versionKey = model?.schema?.options?.versionKey;
  if (versionKey && doc[versionKey] == null) {
    doc[versionKey] = 0;
  }
  insertOne['document'] = doc;

  if (options.skipValidation || insertOne.skipValidation) {
    return insertOne;
  }

  await insertOne['document'].$validate();
  return insertOne;
};

module.exports.castUpdateOne = function castUpdateOne(originalModel, updateOne, options, now) {
  if (!updateOne['filter']) {
    throw new Error('Must provide a filter object.');
  }
  if (!updateOne['update']) {
    throw new Error('Must provide an update object.');
  }

  const model = decideModelByObject(originalModel, updateOne['filter']);
  const schema = model.schema;
  const strict = options.strict != null ? options.strict : model.schema.options.strict;

  const update = clone(updateOne['update']);

  _addDiscriminatorToObject(schema, updateOne['filter']);

  const doInitTimestamps = getTimestampsOpt(updateOne, options);

  if (model.schema.$timestamps != null && doInitTimestamps) {
    const createdAt = model.schema.$timestamps.createdAt;
    const updatedAt = model.schema.$timestamps.updatedAt;
    applyTimestampsToUpdate(now, createdAt, updatedAt, update, {
      timestamps: updateOne.timestamps,
      overwriteImmutable: updateOne.overwriteImmutable
    });
  }

  if (doInitTimestamps) {
    applyTimestampsToChildren(now, update, model.schema);
  }

  const globalSetDefaultsOnInsert = originalModel.base.options.setDefaultsOnInsert;
  const shouldSetDefaultsOnInsert = updateOne.setDefaultsOnInsert == null ?
    globalSetDefaultsOnInsert :
    updateOne.setDefaultsOnInsert;
  if (shouldSetDefaultsOnInsert !== false) {
    setDefaultsOnInsert(updateOne['filter'], model.schema, update, {
      setDefaultsOnInsert: true,
      upsert: updateOne.upsert
    });
  }

  decorateUpdateWithVersionKey(
    update,
    updateOne,
    model.schema.options.versionKey
  );

  updateOne['filter'] = cast(model.schema, updateOne['filter'], {
    strict: strict,
    upsert: updateOne.upsert
  });
  updateOne['update'] = castUpdate(model.schema, update, {
    strict: strict,
    upsert: updateOne.upsert,
    arrayFilters: updateOne.arrayFilters,
    overwriteDiscriminatorKey: updateOne.overwriteDiscriminatorKey,
    overwriteImmutable: updateOne.overwriteImmutable
  }, model, updateOne['filter']);

  return updateOne;
};

module.exports.castUpdateMany = function castUpdateMany(originalModel, updateMany, options, now) {
  if (!updateMany['filter']) {
    throw new Error('Must provide a filter object.');
  }
  if (!updateMany['update']) {
    throw new Error('Must provide an update object.');
  }

  const model = decideModelByObject(originalModel, updateMany['filter']);
  const schema = model.schema;
  const strict = options.strict != null ? options.strict : model.schema.options.strict;

  const globalSetDefaultsOnInsert = originalModel.base.options.setDefaultsOnInsert;
  const shouldSetDefaultsOnInsert = updateMany.setDefaultsOnInsert == null ?
    globalSetDefaultsOnInsert :
    updateMany.setDefaultsOnInsert;

  if (shouldSetDefaultsOnInsert !== false) {
    setDefaultsOnInsert(updateMany['filter'], model.schema, updateMany['update'], {
      setDefaultsOnInsert: true,
      upsert: updateMany.upsert
    });
  }

  const doInitTimestamps = getTimestampsOpt(updateMany, options);

  if (model.schema.$timestamps != null && doInitTimestamps) {
    const createdAt = model.schema.$timestamps.createdAt;
    const updatedAt = model.schema.$timestamps.updatedAt;
    applyTimestampsToUpdate(now, createdAt, updatedAt, updateMany['update'], {
      timestamps: updateMany.timestamps,
      overwriteImmutable: updateMany.overwriteImmutable
    });
  }
  if (doInitTimestamps) {
    applyTimestampsToChildren(now, updateMany['update'], model.schema);
  }

  _addDiscriminatorToObject(schema, updateMany['filter']);

  decorateUpdateWithVersionKey(
    updateMany['update'],
    updateMany,
    model.schema.options.versionKey
  );

  updateMany['filter'] = cast(model.schema, updateMany['filter'], {
    strict: strict,
    upsert: updateMany.upsert
  });

  updateMany['update'] = castUpdate(model.schema, updateMany['update'], {
    strict: strict,
    upsert: updateMany.upsert,
    arrayFilters: updateMany.arrayFilters,
    overwriteDiscriminatorKey: updateMany.overwriteDiscriminatorKey,
    overwriteImmutable: updateMany.overwriteImmutable
  }, model, updateMany['filter']);
};

module.exports.castReplaceOne = async function castReplaceOne(originalModel, replaceOne, options) {
  const model = decideModelByObject(originalModel, replaceOne['filter']);
  const schema = model.schema;
  const strict = options.strict != null ? options.strict : model.schema.options.strict;

  _addDiscriminatorToObject(schema, replaceOne['filter']);
  replaceOne['filter'] = cast(model.schema, replaceOne['filter'], {
    strict: strict,
    upsert: replaceOne.upsert
  });

  // set `skipId`, otherwise we get "_id field cannot be changed"
  const doc = new model(replaceOne['replacement'], strict, true);
  if (model.schema.options.timestamps && getTimestampsOpt(replaceOne, options)) {
    doc.initializeTimestamps();
  }
  if (options.session != null) {
    doc.$session(options.session);
  }
  const versionKey = model?.schema?.options?.versionKey;
  if (versionKey && doc[versionKey] == null) {
    doc[versionKey] = 0;
  }
  replaceOne['replacement'] = doc;

  if (options.skipValidation || replaceOne.skipValidation) {
    replaceOne['replacement'] = replaceOne['replacement'].toBSON();
    return;
  }

  await replaceOne['replacement'].$validate();
  replaceOne['replacement'] = replaceOne['replacement'].toBSON();
};

module.exports.castDeleteOne = function castDeleteOne(originalModel, deleteOne) {
  const model = decideModelByObject(originalModel, deleteOne['filter']);
  const schema = model.schema;

  _addDiscriminatorToObject(schema, deleteOne['filter']);

  deleteOne['filter'] = cast(model.schema, deleteOne['filter']);
};

module.exports.castDeleteMany = function castDeleteMany(originalModel, deleteMany) {
  const model = decideModelByObject(originalModel, deleteMany['filter']);
  const schema = model.schema;

  _addDiscriminatorToObject(schema, deleteMany['filter']);

  deleteMany['filter'] = cast(model.schema, deleteMany['filter']);
};

module.exports.cast = {
  insertOne: module.exports.castInsertOne,
  updateOne: module.exports.castUpdateOne,
  updateMany: module.exports.castUpdateMany,
  replaceOne: module.exports.castReplaceOne,
  deleteOne: module.exports.castDeleteOne,
  deleteMany: module.exports.castDeleteMany
};

function _addDiscriminatorToObject(schema, obj) {
  if (schema == null) {
    return;
  }
  if (schema.discriminatorMapping && !schema.discriminatorMapping.isRoot) {
    obj[schema.discriminatorMapping.key] = schema.discriminatorMapping.value;
  }
}

/**
 * gets discriminator model if discriminator key is present in object
 * @api private
 */

function decideModelByObject(model, object) {
  const discriminatorKey = model.schema.options.discriminatorKey;
  if (object != null && Object.hasOwn(object, discriminatorKey)) {
    model = getDiscriminatorByValue(model.discriminators, object[discriminatorKey]) || model;
  }
  return model;
}

/**
 * gets timestamps option for a given operation. If the option is set within an individual operation, use it. Otherwise, use the global timestamps option configured in the `bulkWrite` options. Overall default is `true`.
 * @api private
 */

function getTimestampsOpt(opCommand, options) {
  const opLevelOpt = opCommand.timestamps;
  const bulkLevelOpt = options.timestamps;
  if (opLevelOpt != null) {
    return opLevelOpt;
  } else if (bulkLevelOpt != null) {
    return bulkLevelOpt;
  }
  return true;
}
