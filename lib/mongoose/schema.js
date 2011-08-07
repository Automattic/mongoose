
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , Types
  , VirtualType = require('./virtualtype')
  , utils = require('./utils')
  , NamedScope = require('./namedscope')
  , Query = require('./query');

/**
 * Schema constructor.
 *
 * @param {Object} definition
 * @api public
 */

function Schema (obj, options) {
  this.paths = {};
  this.virtuals = {};
  this.inherits = {};
  this.callQueue = [];
  this._indexes = [];
  this.methods = {};
  this.statics = {};
  this.tree = {};

  // set options
  this.options = utils.options({
      safe: true
    , 'use$SetOnSave': true
  }, options);

  // build paths
  if (obj)
    this.add(obj);

  if (!this.paths['_id'])
    this.add({ _id: {type: ObjectId, auto: true} });

  if (!this.paths['id'] && !this.options.noVirtualId) {
    this.virtual('id').get(function () {
      return this._id.toString();
    });
  }

  delete this.options.noVirtualId;
};

/**
 * Inherit from EventEmitter.
 */

Schema.prototype.__proto__ = EventEmitter.prototype;

/**
 * Schema by paths
 *
 * Example (embedded doc):
 *    {
 *        'test'       : SchemaType,
 *      , 'test.test'  : SchemaType,
 *      , 'first_name' : SchemaType
 *    }
 *
 * @api private
 */

Schema.prototype.paths;

/**
 * Schema as a tree
 *
 * Example:
 *    {
 *        '_id'     : ObjectId
 *      , 'nested'  : {
 *            'key': String
 *        }
 *    }
 *
 * @api private
 */

Schema.prototype.tree;

// PATCH
/**
 * Internal helper supporting Schema#getMatcher.
 *
 * @see Model#getMatcher
 * @see Schema#getMatcher
 * @param {String} pathString dot-notation prefix for current traversal of properties in the Schema
 * @param {Object} tree the Schema#tree property for the Schema
 * @param {Object} matcherLookup the return value mapping flat property names to dot-notation paths, value casting functions and isArray flags
 * @param {Number} depth depth of recursion of call
 * @api private
 */
var maxDepth = 5;
Schema.prototype.buildMatcherLookup = function (pathString, tree, matcherLookup, depth) {    
  // Guard against arbitrarily deep recursion for properties that are 
  //   object/Schema types with properties that are other object/Schema types forming a cycle
  if (depth > maxDepth) {
    return matcherLookup;
  }
  depth += 1;
  
  // Helpers
  var MatcherLookupEntry = function (p, c, a) {
    return {pathString : p, caster : c, isArray : a};
  };
  // Guard against overwriting existing entries. As documented, this function will only behave as expected
  //  if all properties in Schema at all levels have unique names. So the function creates an entry only for
  //  the first instance of any name encountered without qualifying it with its full dot notation path (the
  //  entire point of using the Matcher.)  But it will create dot-notation qualified entries if there is a 
  //  clash, so these can be accessed by full path.  
  var makeLookupEntry = function (prop, pathString, caster, isArrayVal) {
    var entry = MatcherLookupEntry(pathString, caster, isArrayVal);    
    if (! matcherLookup.hasOwnProperty(prop)) {
      matcherLookup[prop] = entry;        
    }
    else {
      matcherLookup[pathString] = entry;        
    }    
  };
    
  var isArray = function (value) {
    return Object.prototype.toString.apply(value) === '[object Array]';
  };
  
  var isFunction = function (value) { 
     return typeof value === 'function'; 
  };  
  
  var isObject = function (value, literal) {
    var type = typeof value, test = !!value && type === 'object';
    return test && literal ? value.constructor === Object : test;
  };  

  var isMongooseSchema = function (v) {
    return (isObject(v) && v.hasOwnProperty('paths') && v.hasOwnProperty('tree')); 
  };
  
  var mongooseSchemaTreeEquals = function (s1, s2) {
    var objLen = function (o) {
      var l = 0;
      for (prop in o) {
        l += 1;
      }
      return l;
    };
    var isSamePropertyVal = function (pv1, pv2) {
      if ( (isArray(pv1) && isArray(pv2)) || (isFunction(pv1) && isFunction(pv2)) || 
           (isObject(pv1) && isObject(pv2)) || (isMongooseSchema(pv1) && isMongooseSchema(pv2)) ) {
        return true;
      }
      return false;
    };
    
    // Compare the tree property of each Schema object for same length    
    var l1, l2;
    if ((l1 = objLen(s1)) !== (l2 = objLen(s2))) {
      return false; 
    }
        
    // Iterate  each tree, insuring same property names and Schema data types
    for (prop in s1) {
      if (! prop in s2) {
        return false;
      }
      else if (! isSamePropertyVal(s1[prop], s2[prop])) {
        return false;
      }
    }    
    return true;
  };
  
  var noOpCaster = function (value) {
    return value;
  };
  // /Helpers
  
  var propVal = null;
  var curPathString = pathString;
  var isArrayVal = false;
  var literal = 1;
   
  for (prop in tree) {    
    pathString = curPathString;
    // Build dot-notation path
    if (pathString.length > 0) {
      pathString += '.';
    }
    pathString += prop;
    
    // NOTE: Depends on internal Schema property 'tree' property implementation.
    // tree is an object with a structure mirroring the Schema definition.
    // Properties are fields in the Schema.  Their value is:
    //  - a casting function for the type of data the field holds, if the field is a simple type
    //    i.e. string, number, boolean or date
    //  - a nested object if the field contains nested objects
    //  - a nested MongooseSchema (a specific object type) if the field holds nested Schemas
    //  - an array if the field holds any type of value in an embedded array
    propVal = tree[prop];
    
    if (isArrayVal = isArray(propVal)) {   
      // Arrays can be empty in Mongoose, contain a compound type (object or Schema) or a simple type
      // Arrays are empty or homogenous (have values of only one type).  So if the tree value is an array:
      //  - if the array in the tree contains a function, then the function is the caster
      //  - if the array in the tree contains objects or Schema objects, create two entries:
      //   - one is recurse to build dot notation for matching single objects in arrays
      //   - one is an entry at the array level without dot notation into the object, passing literal through
      //     because matching more than one object using $in requires matching on an array of literal values 
      //  - if the array in the tree is empty (which is legal in Mongoose), then we can't know what type the
      //    array may contain, so create an entry that passes through literal values to match exactly
      if (propVal.length === 0)
      {
        makeLookupEntry(prop, pathString, noOpCaster, isArrayVal);
        continue;
      }
      else {
        propVal = propVal[0];        
      }
    }            

    if (isFunction(propVal, literal)) {
      makeLookupEntry(prop, pathString, propVal, isArrayVal);
    }
    else if(isMongooseSchema(propVal)) {
      // Embedded object in array, create entry for literal match as per comment above
      if (isArrayVal) {
        makeLookupEntry(prop, pathString, noOpCaster, isArrayVal);
      }
      
      // If embedded Schema is a a child property of the same Schema, we know we have endless recursion, 
      /// so just support one level of recursion from here
      if (mongooseSchemaTreeEquals(tree, propVal.tree) && depth < maxDepth) {
        depth = maxDepth;
      }
      
      // Recurse
      matcherLookup = this.buildMatcherLookup(pathString, propVal.tree, matcherLookup, depth);
    }
    else if (isObject(propVal)) {
      if (isArrayVal) {
        makeLookupEntry(prop, pathString, noOpCaster, isArrayVal);
      }
      
      // Always recurse on embedded plain objects (not Schemas), because these aren't as much "types"
      //  as Schemas so there isn't as clear a case of identifying self-reference children and cycles. So
      //  just allow and guard against stack overflow
      matcherLookup = this.buildMatcherLookup(pathString, propVal, matcherLookup, depth);      
    }
  }
  
  return matcherLookup;
}

/**
 * Internal implementation supporting Model#getMatcher.
 *
 * @see Model#getMatcher
 * @see Schema#buildMatcherLookup
 * @param {Object} matchArgs JSON properties/values to use in a query matching documents of this Model's Schema
 * @api private
 */
Schema.prototype.getMatcher = function (matchArgs) {
  // Helper
	var isArray = function (value) {
	 	return Object.prototype.toString.apply(value) === '[object Array]';
	};
	// The JSON set of document properties/values to return
	var pathString = '';
	var matcherLookup = {};
	var depth = 0;
	matcherLookup = this.buildMatcherLookup(pathString, this.tree, matcherLookup, depth);
	
	// JSON in valid MongoDB dot-notation and "$in" syntax to be match pred in find(), update() and delete() Mongo calls
	var matcher = {};
	var propVal = null;
	var mlEntry = null;
	var j = 0;
	
	for (prop in matchArgs) {	  
		if (matcherLookup.hasOwnProperty(prop)) {		  
  	  propVal = matchArgs[prop];
		  mlEntry = matcherLookup[prop];
	
		  // Handle embedded array cases 
		  if (mlEntry.isArray) {		    
		    // Client can pass in single values or array of values to match against array fields
		    // Single values match with standard dot notation, as MongoDB transparently searches the embedded array for
		    //  all objects matching the predicate value
		    // Multiple values work like SQL "IN", meaning MongoDB searches the embedded array for all objects matching *any*
		    //  of the values in the predicate.  Multiple values require "$in" operator in matcher.
		    if (isArray(propVal)) {
  		    // Loop over all values, cast each one
  		    for (j = 0; j < propVal.length; j += 1) {  		      
  		      propVal[j] = mlEntry.caster(propVal[j]);
  		    }

  		    matcher[mlEntry.pathString] = {"$in" : propVal};
  		  }
  		  else {
  		    matcher[mlEntry.pathString] = mlEntry.caster(propVal);
  		  }		    
		  }
		  // Matching single value field
		  else {
		    matcher[mlEntry.pathString] = mlEntry.caster(propVal);
		  }
		}
	}
	
	return matcher;
}
// /PATCH

/**
 * Sets the keys
 *
 * @param {Object} keys
 * @param {String} prefix
 * @api public
 */

Schema.prototype.add = function (obj, prefix) {
  prefix = prefix || '';
  for (var i in obj) {
    // make sure set of keys are in `tree`
    if (!prefix && !this.tree[i])
      this.tree[i] = obj[i];

    if (obj[i].constructor == Object && (!obj[i].type || obj[i].type.type)) {
      if (Object.keys(obj[i]).length)
        this.add(obj[i], prefix + i + '.');
      else
        this.path(prefix + i, obj[i]); // mixed type
    } else
      this.path(prefix + i, obj[i]);
  }
};

/**
 * Sets a path (if arity 2)
 * Gets a path (if arity 1)
 *
 * @param {String} path
 * @param {Object} constructor
 * @api public
 */

Schema.prototype.path = function (path, obj) {
  if (obj == undefined) {
    if (this.paths[path]) return this.paths[path];

    // Sometimes path will come in as
    // pathNameA.4.pathNameB where 4 means the index
    // of an embedded document in an embedded array.
    // In this case, we need to jump to the Array's
    // schema and call path() from there to resolve to
    // the correct path type (otherwise, it falsely
    // resolves to undefined
    var self = this
      , subpaths = path.split(/\.\d+\./);
    if (subpaths.length > 1) {
      return subpaths.reduce( function (val, subpath) {
        return val ? val.schema.path(subpath)
                   : self.path(subpath);
      }, null);
    }
    return; // Otherwise, return `undefined`
  }

  this.paths[path] = Schema.interpretAsType(path, obj);
  return this;
};

/**
 * Converts -- e.g., Number, [SomeSchema], 
 * { type: String, enum: ['m', 'f'] } -- into
 * the appropriate Mongoose Type, which we use
 * later for casting, validation, etc.
 * @param {String} path
 * @param {Object} constructor
 */

Schema.interpretAsType = function (path, obj) {
  if (obj.constructor != Object)
    obj = { type: obj };

  // Get the type making sure to allow keys named "type"
  // and default to mixed if not specified.
  // { type: { type: String, default: 'freshcut' } }
  var type = obj.type && !obj.type.type
    ? obj.type
    : {};

  if (type.constructor == Object) {
    return new Types.Mixed(path, obj);
  }

  if (Array.isArray(type) || type == Array) {
    // if it was specified through { type } look for `cast`
    var cast = type == Array
      ? obj.cast
      : type[0];

    cast = cast || Types.Mixed;

    if (cast instanceof Schema) {
      return new Types.DocumentArray(path, cast, obj);
    }
    return new Types.Array(path, cast, obj);
  }
  return new Types[type.name](path, obj);
};

/**
 * Iterates through the schema's paths, passing the path string and type object
 * to the callback.
 *
 * @param {Function} callback function - fn(pathstring, type)
 * @return {Schema} this for chaining
 * @api public
 */

Schema.prototype.eachPath = function (fn) {
  var keys = Object.keys(this.paths)
    , len = keys.length;

  for (var i = 0; i < len; ++i) {
    fn(keys[i], this.paths[keys[i]]);
  }

  return this;
};

/**
 * Returns an Array of path strings that are required.
 * @api public
 */

Object.defineProperty(Schema.prototype, 'requiredPaths', {
  get: function () {
    var paths = this.paths
      , pathnames = Object.keys(paths)
      , i = pathnames.length
      , pathname, path
      , requiredPaths = [];
    while (i--) {
      pathname = pathnames[i];
      path = paths[pathname];
      if (path.isRequired) requiredPaths.push(pathname);
    }
    return requiredPaths;
  }
});

/**
 * Given a path, returns whether it is a real, virtual, or
 * ad-hoc/undefined path
 *
 * @param {String} path
 * @return {String}
 * @api public
 */
Schema.prototype.pathType = function (path) {
  if (path in this.paths) return 'real';
  if (path in this.virtuals) return 'virtual';
  return 'adhocOrUndefined';
};

/**
 * Adds a method call to the queue
 *
 * @param {String} method name
 * @param {Array} arguments
 * @api private
 */

Schema.prototype.queue = function(name, args){
  this.callQueue.push([name, args]);
  return this;
};

/**
 * Defines a pre for the document
 *
 * @param {String} method
 * @param {Function} callback
 * @api public
 */

Schema.prototype.pre = function(){
  return this.queue('pre', arguments);
};

/**
 * Defines a post for the document
 *
 * @param {String} method
 * @param {Function} callback
 * @api public
 */

Schema.prototype.post = function(method, fn){
  return this.queue('on', arguments);
};

/**
 * Registers a plugin for this schema
 *
 * @param {Function} plugin callback
 * @api public
 */

Schema.prototype.plugin = function (fn, opts) {
  fn(this, opts);
  return this;
};

/**
 * Adds a method
 *
 * @param {String} method name
 * @param {Function} handler
 * @api public
 */

Schema.prototype.method = function (name, fn) {
  if ('string' != typeof name)
    for (var i in name)
      this.methods[i] = name[i];
  else
    this.methods[name] = fn;
  return this;
};

/**
 * Defines a static method
 *
 * @param {String} name
 * @param {Function} handler
 * @api public
 */

Schema.prototype.static = function(name, fn) {
  if ('string' != typeof name)
    for (var i in name)
      this.statics[i] = name[i];
  else
    this.statics[name] = fn;
  return this;
};

/**
 * Defines an index (most likely compound)
 * Example:
 *    schema.index({ first: 1, last: -1 })
 *
 * @param {Object} field
 * @param {Object} optional options object
 * @api public
 */

Schema.prototype.index = function (fields, options) {
  this._indexes.push([fields, options || {}]);
  return this;
};

/**
 * Sets/gets an option
 *
 * @param {String} key
 * @param {Object} optional value
 * @api public
 */

Schema.prototype.set = function (key, value) {
  if (arguments.length == 1)
    return this.options[key];
  this.options[key] = value;
  return this;
};

/**
 * Compiles indexes from fields and schema-level indexes
 *
 * @api public
 */

Schema.prototype.__defineGetter__('indexes', function () {
  var indexes = []
    , seenSchemas = [];

  collectIndexes(this);

  return indexes;

  function collectIndexes (schema, prefix) {
    if (~seenSchemas.indexOf(schema)) return;
    seenSchemas.push(schema);

    var index;
    var paths = schema.paths;
    prefix = prefix || '';

    for (var i in paths) {
      if (paths[i]) {
        if (paths[i] instanceof Types.DocumentArray) {
          collectIndexes(paths[i].schema, i + '.');
        } else {
          index = paths[i]._index;

          if (index !== false && index !== null){
            var field = {};
            field[prefix + i] = '2d' === index ? index : 1;
            indexes.push([field, index.constructor == Object ? index : {} ]);
          }
        }
      }
    }

    if (prefix) {
      fixSubIndexPaths(schema, prefix);
    } else {
      indexes = indexes.concat(schema._indexes);
    }
  }

  /**
   * Checks for indexes added to subdocs using Schema.index().
   * These indexes need their paths prefixed properly.
   *
   * schema._indexes = [ [indexObj, options], [indexObj, options] ..]
   */

  function fixSubIndexPaths (schema, prefix) {
    var subindexes = schema._indexes
      , len = subindexes.length
      , indexObj
      , newindex
      , klen
      , keys
      , key
      , i = 0
      , j

    for (i = 0; i < len; ++i) {
      indexObj = subindexes[i][0];
      keys = Object.keys(indexObj);
      klen = keys.length;
      newindex = {};

      // use forward iteration, order matters
      for (j = 0; j < klen; ++j) {
        key = keys[j];
        newindex[prefix + key] = indexObj[key];
      }

      indexes.push([newindex, subindexes[i][1]]);
    }
  }

});

/**
 * Retrieves or creates the virtual type with the given name.
 *
 * @param {String} name
 * @return {VirtualType}
 */

Schema.prototype.virtual = function (name) {
  var virtuals = this.virtuals || (this.virtuals = {});
  var parts = name.split('.');
  return virtuals[name] = parts.reduce( function (mem, part, i) {
    mem[part] || (mem[part] = (i === parts.length-1)
                            ? new VirtualType()
                            : {});
    return mem[part];
  }, this.tree);
};

/**
 * Fetches the virtual type with the given name.
 * Should be distinct from virtual because virtual auto-defines a new VirtualType
 * if the path doesn't exist.
 *
 * @param {String} name
 * @return {VirtualType}
 */

Schema.prototype.virtualpath = function (name) {
  return this.virtuals[name];
};

Schema.prototype.namedScope = function (name, fn) {
  var namedScopes = this.namedScopes || (this.namedScopes = new NamedScope)
    , newScope = Object.create(namedScopes)
    , allScopes = namedScopes.scopesByName || (namedScopes.scopesByName = {});
  allScopes[name] = newScope;
  newScope.name = name;
  newScope.block = fn;
  newScope.query = new Query();
  newScope.decorate(namedScopes, {
    block0: function (block) {
      return function () {
        block.call(this.query);
        return this;
      };
    },
    blockN: function (block) {
      return function () {
        block.apply(this.query, arguments);
        return this;
      };
    },
    basic: function (query) {
      return function () {
        this.query.find(query);
        return this;
      };
    }
  });
  return newScope;
};

/**
 * ObjectId schema identifier. Not an actual ObjectId, only used for Schemas.
 *
 * @api public
 */

function ObjectId () {
  throw new Error('This is an abstract interface. Its only purpose is to mark '
                + 'fields as ObjectId in the schema creation.');
}

/**
 * Module exports.
 */

module.exports = exports = Schema;

// require down here because of reference issues
exports.Types = Types = require('./schema/index');

exports.ObjectId = ObjectId;
