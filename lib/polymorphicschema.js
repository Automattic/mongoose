
/**
 * Module dependencies.
 */

var Schema = require('./schema');
var VirtualType = require('./virtualtype');
var utils = require('./utils');

var SchemaDeterminant = {};

function createSubSchemaDeterminant(subModelNames) {
  return {
    type : String,
    required : true,
    enum : subModelNames || []
  };
}

function findAndNormalizeSchemaDeterminant(obj) {
  var determinantProp;
  for (var prop in obj) {
    if (obj[prop] === SchemaDeterminant ||
      obj[prop] && obj[prop].type === SchemaDeterminant) {
      
      if (determinantProp) {
        throw new Error("Only one property of the Schema can be a SchemaDeterminant. " +
          "Found '" + determinantProp + "' and '" + prop + "'");
      }

      var newPropValue = createSubSchemaDeterminant([]);
      utils.merge(newPropValue, obj[prop]);
      obj[prop] = newPropValue;
      determinantProp = prop;
    }
  }
  return determinantProp;
}

// make sure that merging properties from sourceSchema into destSchema won't
// modify existing properties on destSchema
// check for differing types or mismatched nesting levels.
function ensureNoConflicts(destSchema, sourceSchema) {
  var errors = [];
  destSchema.eachPath(function(destPath, destType) {
    if (sourceSchema.paths[destPath]) {
      var srcType = sourceSchema.paths[destPath];
      if (!(destType instanceof srcType.__proto__.constructor)) {
        errors.push(new TypeError(
          "Path '" + destPath + "' of type '" + srcType.__proto__.constructor.name + "' is incompatible with type " +
          "'" + destType.__proto__.constructor.name + "'"));
      }
    } else if (sourceSchema.pathType(destPath) === 'nested') {
      errors.push(new TypeError("Nested properties object at path '" + destPath +
        "' conflicts with property in destination schema."));
    }
  });
  sourceSchema.eachPath(function(srcPath, srcType) {
    if (destSchema.pathType(srcPath) === 'nested') {
      errors.push(new TypeError("Property at path '" + srcPath +
        "' conflicts with nested properties object in destination schema."));
    }
  });
  return errors;
}

// revert to a real-paths-only descriptor of the schema. Allow custom modifications
// through a transformation callback applied to each property descriptor as cb(path, descriptor).
function revertToDescriptor(schema, cb) {
  var descriptor = {};
  schema.eachPath(function(path, type) {
    var root = descriptor;
    var parts = path.split('.');
    var lastPart = parts.pop();
    var propDescriptor = utils.clone(type.options);
    while (parts.length) {
      var part = parts.shift();
      root = (part in root) ? root[part] : (root[part] = {});
    }
    root[lastPart] = (cb && cb(path, propDescriptor)) || propDescriptor;
  });
  return descriptor;
}

function PolymorphicSchema(obj, options) {

  var self = this;
  
  this.subModelNames = [];
  this.schemasByModelName = {};
  this.schemaDeterminantProperty = findAndNormalizeSchemaDeterminant(obj);

  if (!this.schemaDeterminantProperty) {
    throw new Error("SchemaDeterminant is required to exist on a PolymorphicSchema.");
  }

  Schema.apply(this, arguments);

  this.statics.getModelForDoc = function(doc) {
    var subModelName = doc[self.schemaDeterminantProperty];
    return this.model(PolymorphicSchema.getSubModelName(this, subModelName)) || this;
  };
  this.statics.sub = function(subModelName) {
    return this.model(PolymorphicSchema.getSubModelName(this, subModelName));
  };
}
PolymorphicSchema.__proto__ = Schema;
PolymorphicSchema.prototype.__proto__ = Schema.prototype;

PolymorphicSchema.getSubModelName = function(model, subModelName) {
  return model.modelName + '_' + subModelName;
};

/**
 * Property name used for sub-schema lookup.
 *
 * @api private
 */
PolymorphicSchema.prototype.schemaDeterminantProperty;

/**
 * Registry of type identifier to sub-schema.
 *
 * @api private
 */
PolymorphicSchema.prototype.schemasByModelName;

/**
 * List of sub-schema identifiers.
 *
 * @api private
 */
PolymorphicSchema.prototype.subModelNames;

/**
 * Registers a possible schema to use when models are pulled from the db
 * @param subModelName {String} the model name to use for this schema.
 * @param schema {Object} the schema.
 *
 * @api public
 */
PolymorphicSchema.prototype.sub = function(subModelName, schema) {
  var errors = ensureNoConflicts(this, schema);
  if (errors.length) {
    throw new Error((errors.length === 1 ? "Error" : "Errors") + " registering '" + subModelName + "':\n" +
                    errors.join('\n'));
  }

  var self = this;
  // when forming the descriptor, remove required and default options that differ from the parent.
  var schemaDescriptor = revertToDescriptor(schema, function (path, obj) {
    if (obj.required && !(self.paths[path] && self.paths[path].isRequired)) {
      delete obj.required;
    }
    if (self.paths[path] && self.paths[path].defaultValue) {
      obj.default = self.paths[path].defaultValue;
    } else if (obj.default) {
      delete obj.default;
    }
    return obj;
  });

  this.add(schemaDescriptor);
  
  this.schemasByModelName[subModelName] = schema;
  this.subModelNames.push(subModelName);

  this.path(this.schemaDeterminantProperty, createSubSchemaDeterminant(this.subModelNames));
};

/**
 * TypeDeterminant is a special type that is required to be present exactly once in a PolymorphicSchema.
 * It indicates that this property can be used to lookup the correct Schema when retrieving a model from the database.
 *
 * @api public
 */
PolymorphicSchema.SchemaDeterminant = SchemaDeterminant;

module.exports = PolymorphicSchema;