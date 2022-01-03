'use strict';

const applyTimestampsToChildren = require('../update/applyTimestampsToChildren');
const applyTimestampsToUpdate = require('../update/applyTimestampsToUpdate');
const get = require('../get');
const handleTimestampOption = require('../schema/handleTimestampOption');
const symbols = require('../../schema/symbols');

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
  const currentTime = timestamps != null && timestamps.hasOwnProperty('currentTime') ?
    timestamps.currentTime :
    null;
  const schemaAdditions = {};

  schema.$timestamps = { createdAt: createdAt, updatedAt: updatedAt };

  if (updatedAt && !schema.paths[updatedAt]) {
    schemaAdditions[updatedAt] = Date;
  }

  if (createdAt && !schema.paths[createdAt]) {
    schemaAdditions[createdAt] = { [schema.options.typeKey || 'type']: Date, immutable: true };
  }
  schema.add(schemaAdditions);

  schema.pre('save', function(next) {
    const timestampOption = get(this, '$__.saveOptions.timestamps');
    if (timestampOption === false) {
      return next();
    }

    const skipUpdatedAt = timestampOption != null && timestampOption.updatedAt === false;
    const skipCreatedAt = timestampOption != null && timestampOption.createdAt === false;

    const defaultTimestamp = currentTime != null ?
      currentTime() :
      this.ownerDocument().constructor.base.now();
    const auto_id = this._id && this._id.auto;

    if (!skipCreatedAt && this.isNew && createdAt && !this.$__getValue(createdAt) && this.$__isSelected(createdAt)) {
      this.$set(createdAt, auto_id ? this._id.getTimestamp() : defaultTimestamp);
    }

    if (!skipUpdatedAt && updatedAt && (this.isNew || this.$isModified())) {
      let ts = defaultTimestamp;
      if (this.isNew) {
        if (createdAt != null) {
          ts = this.$__getValue(createdAt);
        } else if (auto_id) {
          ts = this._id.getTimestamp();
        }
      }
      this.$set(updatedAt, ts);
    }

    next();
  });

  schema.methods.initializeTimestamps = function() {
    const ts = currentTime != null ?
      currentTime() :
      this.constructor.base.now();
    if (createdAt && !this.get(createdAt)) {
      this.$set(createdAt, ts);
    }
    if (updatedAt && !this.get(updatedAt)) {
      this.$set(updatedAt, ts);
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

  function _setTimestampsOnUpdate(next) {
    const now = currentTime != null ?
      currentTime() :
      this.model.base.now();
    // Replacing with null update should still trigger timestamps
    if (this.op === 'findOneAndReplace' && this.getUpdate() == null) {
      this.setUpdate({});
    }
    applyTimestampsToUpdate(now, createdAt, updatedAt, this.getUpdate(),
      this.options, this.schema);
    applyTimestampsToChildren(now, this.getUpdate(), this.model.schema);
    next();
  }
};