'use strict';

const applyTimestampsToChildren = require('../update/applyTimestampsToChildren');
const applyTimestampsToUpdate = require('../update/applyTimestampsToUpdate');
const get = require('../get');
const handleTimestampOption = require('../schema/handleTimestampOption');
const setDocumentTimestamps = require('./setDocumentTimestamps');
const symbols = require('../../schema/symbols');

const replaceOps = new Set([
  'replaceOne',
  'findOneAndReplace'
]);

module.exports = function setupTimestamps(schema, timestamps) {
  const childHasTimestamp = schema.childSchemas.find(withTimestamp);
  function withTimestamp(s) {
    const ts = s.schema.options.timestamps;
    return !!ts;
  }
  if (!timestamps && !childHasTimestamp) {
    return;
  }
  const createdAt = handleTimestampOption(timestamps, 'createdAt');
  const updatedAt = handleTimestampOption(timestamps, 'updatedAt');
  const currentTime = timestamps != null && Object.hasOwn(timestamps, 'currentTime') ?
    timestamps.currentTime :
    null;
  const schemaAdditions = {};

  schema.$timestamps = { createdAt: createdAt, updatedAt: updatedAt };

  if (createdAt && !schema.paths[createdAt]) {
    const baseImmutableCreatedAt = schema.base?.get('timestamps.createdAt.immutable') ?? null;
    const immutable = baseImmutableCreatedAt ?? true;
    schemaAdditions[createdAt] = { [schema.options.typeKey || 'type']: Date, immutable };
  }

  if (updatedAt && !schema.paths[updatedAt]) {
    schemaAdditions[updatedAt] = Date;
  }

  schema.add(schemaAdditions);

  schema.pre('save', function timestampsPreSave() {
    const timestampOption = get(this, '$__.saveOptions.timestamps');
    if (timestampOption === false) {
      return;
    }

    setDocumentTimestamps(this, timestampOption, currentTime, createdAt, updatedAt);
  });

  schema.methods.initializeTimestamps = function(timestampsOptions) {
    if (timestampsOptions === false) {
      return this;
    }
    const ts = currentTime != null ?
      currentTime() : this.constructor.base.now();

    const initTimestampsCreatedAt = timestampsOptions != null ?
      handleTimestampOption(timestampsOptions, 'createdAt') :
      createdAt;
    const initTimestampsUpdatedAt = timestampsOptions != null ?
      handleTimestampOption(timestampsOptions, 'updatedAt') :
      updatedAt;

    if (initTimestampsCreatedAt && !this.get(initTimestampsCreatedAt)) {
      this.$set(createdAt, ts);
    }
    if (initTimestampsUpdatedAt && !this.get(initTimestampsUpdatedAt)) {
      this.$set(updatedAt, ts);
    }
    if (this.$isSubdocument) {
      return this;
    }

    const subdocs = this.$getAllSubdocs();
    for (const subdoc of subdocs) {
      if (subdoc.initializeTimestamps) {
        subdoc.initializeTimestamps(timestampsOptions);
      }
    }

    return this;
  };

  _setTimestampsOnUpdate[symbols.builtInMiddleware] = true;

  const opts = { query: true, model: false };
  schema.pre('findOneAndReplace', opts, _setTimestampsOnUpdate);
  schema.pre('findOneAndUpdate', opts, _setTimestampsOnUpdate);
  schema.pre('replaceOne', opts, _setTimestampsOnUpdate);
  schema.pre('update', opts, _setTimestampsOnUpdate);
  schema.pre('updateOne', opts, _setTimestampsOnUpdate);
  schema.pre('updateMany', opts, _setTimestampsOnUpdate);

  function _setTimestampsOnUpdate() {
    const now = currentTime != null ?
      currentTime() :
      this.model.base.now();
    // Replacing with null update should still trigger timestamps
    if (replaceOps.has(this.op) && this.getUpdate() == null) {
      this.setUpdate({});
    }
    applyTimestampsToUpdate(
      now,
      createdAt,
      updatedAt,
      this.getUpdate(),
      this._mongooseOptions,
      replaceOps.has(this.op)
    );
    applyTimestampsToChildren(now, this.getUpdate(), this.model.schema);
  }
};
