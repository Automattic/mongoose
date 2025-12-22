'use strict';

/*!
 * Module dependencies.
 */

const ValidationError = require('../error/validation');
const cleanPositionalOperators = require('./schema/cleanPositionalOperators');
const flatten = require('./common').flatten;

/**
 * Applies validators and defaults to update and findOneAndUpdate operations,
 * specifically passing a null doc as `this` to validators and defaults
 *
 * @param {Query} query
 * @param {Schema} schema
 * @param {Object} castedDoc
 * @param {Object} options
 * @method runValidatorsOnUpdate
 * @api private
 */

module.exports = async function updateValidators(query, schema, castedDoc, options) {
  const keys = Object.keys(castedDoc || {});
  let updatedKeys = {};
  let updatedValues = {};
  const isPull = {};
  const arrayAtomicUpdates = {};
  const numKeys = keys.length;
  let hasDollarUpdate = false;
  let currentUpdate;
  let key;

  for (let i = 0; i < numKeys; ++i) {
    if (keys[i].startsWith('$')) {
      hasDollarUpdate = true;
      if (keys[i] === '$push' || keys[i] === '$addToSet') {
        const _keys = Object.keys(castedDoc[keys[i]]);
        for (let ii = 0; ii < _keys.length; ++ii) {
          currentUpdate = castedDoc[keys[i]][_keys[ii]];
          if (currentUpdate?.$each) {
            arrayAtomicUpdates[_keys[ii]] = (arrayAtomicUpdates[_keys[ii]] || []).
              concat(currentUpdate.$each);
          } else {
            arrayAtomicUpdates[_keys[ii]] = (arrayAtomicUpdates[_keys[ii]] || []).
              concat([currentUpdate]);
          }
        }
        continue;
      }
      const flat = flatten(castedDoc[keys[i]], null, null, schema);
      const paths = Object.keys(flat);
      const numPaths = paths.length;
      for (let j = 0; j < numPaths; ++j) {
        const updatedPath = cleanPositionalOperators(paths[j]);
        key = keys[i];
        // With `$pull` we might flatten `$in`. Skip stuff nested under `$in`
        // for the rest of the logic, it will get handled later.
        if (updatedPath.includes('$')) {
          continue;
        }
        if (key === '$set' || key === '$setOnInsert' ||
            key === '$pull' || key === '$pullAll') {
          updatedValues[updatedPath] = flat[paths[j]];
          isPull[updatedPath] = key === '$pull' || key === '$pullAll';
        } else if (key === '$unset') {
          updatedValues[updatedPath] = undefined;
        }
        updatedKeys[updatedPath] = true;
      }
    }
  }

  if (!hasDollarUpdate) {
    updatedValues = flatten(castedDoc, null, null, schema);
    updatedKeys = Object.keys(updatedValues);
  }

  const updates = Object.keys(updatedValues);
  const numUpdates = updates.length;
  const validatorsToExecute = [];
  const validationErrors = [];

  const alreadyValidated = [];

  const context = query;
  for (let i = 0; i < numUpdates; ++i) {
    const v = updatedValues[updates[i]];
    const schemaPath = schema._getSchema(updates[i]);
    if (schemaPath == null) {
      continue;
    }
    if (schemaPath.instance === 'Mixed' && schemaPath.path !== updates[i]) {
      continue;
    }

    if (v && Array.isArray(v.$in)) {
      v.$in.forEach((v, i) => {
        validatorsToExecute.push(
          schemaPath.doValidate(v, context, { updateValidator: true }).catch(err => {
            err.path = updates[i] + '.$in.' + i;
            validationErrors.push(err);
          })
        );
      });
    } else {
      if (isPull[updates[i]] &&
          schemaPath.$isMongooseArray) {
        continue;
      }

      if (schemaPath.$isMongooseDocumentArrayElement && v?.$__ != null) {
        alreadyValidated.push(updates[i]);
        validatorsToExecute.push(
          schemaPath.doValidate(v, context, { updateValidator: true }).catch(err => {
            if (err.errors) {
              for (const key of Object.keys(err.errors)) {
                const _err = err.errors[key];
                _err.path = updates[i] + '.' + key;
                validationErrors.push(_err);
              }
            } else {
              err.path = updates[i];
              validationErrors.push(err);
            }
          })
        );
      } else {
        const isAlreadyValidated = alreadyValidated.find(path => updates[i].startsWith(path + '.'));
        if (isAlreadyValidated) {
          continue;
        }
        if (schemaPath.$isSingleNested) {
          alreadyValidated.push(updates[i]);
        }
        validatorsToExecute.push(
          schemaPath.doValidate(v, context, { updateValidator: true }).catch(err => {
            if (schemaPath.schema != null &&
                schemaPath.schema.options.storeSubdocValidationError === false &&
                err instanceof ValidationError) {
              return;
            }

            if (err) {
              err.path = updates[i];
              validationErrors.push(err);
            }
          })
        );
      }
    }
  }

  const arrayUpdates = Object.keys(arrayAtomicUpdates);
  for (const arrayUpdate of arrayUpdates) {
    let schemaPath = schema._getSchema(arrayUpdate);
    if (schemaPath && schemaPath.$isMongooseDocumentArray) {
      validatorsToExecute.push(
        schemaPath.doValidate(
          arrayAtomicUpdates[arrayUpdate],
          options?.context === 'query' ? query : null
        ).catch(err => {
          err.path = arrayUpdate;
          validationErrors.push(err);
        })
      );
    } else {
      schemaPath = schema._getSchema(arrayUpdate + '.0');
      for (const atomicUpdate of arrayAtomicUpdates[arrayUpdate]) {
        validatorsToExecute.push(
          schemaPath.doValidate(
            atomicUpdate,
            options?.context === 'query' ? query : null,
            { updateValidator: true }
          ).catch(err => {
            err.path = arrayUpdate;
            validationErrors.push(err);
          })
        );
      }
    }
  }

  await Promise.all(validatorsToExecute);
  if (validationErrors.length) {
    const err = new ValidationError(null);

    for (const validationError of validationErrors) {
      err.addError(validationError.path, validationError);
    }
    throw err;
  }
};
