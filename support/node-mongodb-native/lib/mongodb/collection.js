/**
 * Module dependencies.
 */
var InsertCommand = require('./commands/insert_command').InsertCommand
  , QueryCommand = require('./commands/query_command').QueryCommand
  , DeleteCommand = require('./commands/delete_command').DeleteCommand
  , UpdateCommand = require('./commands/update_command').UpdateCommand
  , DbCommand = require('./commands/db_command').DbCommand
  , BinaryParser = require('./bson/binary_parser').BinaryParser
  , Cursor = require('./cursor').Cursor
  , debug = require('util').debug
  , inspect = require('util').inspect;

/**
 * Sort functions, Normalize and prepare sort parameters
 */

function formatSortValue (sortDirection) {
  var value = ("" + sortDirection).toLowerCase();

  switch (value) {
    case 'ascending':
    case 'asc':
    case '1':
      return 1;
    case 'descending':
    case 'desc':
    case '-1':
      return -1;
    default:
      throw new Error("Illegal sort clause, must be of the form "
                    + "[['field1', '(ascending|descending)'], "
                    + "['field2', '(ascending|descending)']]");
  }
};

function formattedOrderClause (sortValue) {
  var orderBy = {};

  if (Array.isArray(sortValue)) {
    sortValue.forEach(function (sortElement) {
      if (sortElement.constructor == String) {
        orderBy[sortElement] = 1;
      } else {
        orderBy[sortElement[0]] = formatSortValue(sortElement[1]);
      }
    });
  } else if (sortValue.constructor == String) {
    orderBy[sortValue] = 1;
  } else {
    throw new Error("Illegal sort clause, must be of the form " +
      "[['field1', '(ascending|descending)'], ['field2', '(ascending|descending)']]");
  }

  return orderBy;
};

/**
 * toString helper.
 */

var toString = Object.prototype.toString;

/**
 * Collection constructor.
 *
 * @param {Database} db
 * @param {String} collectionName
 * @param {Function} pkFactory
 */

function Collection (db, collectionName, pkFactory, options) {
  this.checkCollectionName(collectionName);

  this.db = db;
  this.collectionName = collectionName;
  this.internalHint;
  this.opts = options != null && ('object' === typeof options) ? options : {};
  this.slaveOk = options == null || options.slaveOk == null ? db.slaveOk : options.slaveOk;

  // debug("======================================================== options")
  // debug(inspect(options))

  this.pkFactory = pkFactory == null
    ? db.bson_serializer.ObjectID
    : pkFactory;

  Object.defineProperty(this, "hint", {
      enumerable: true
    , get: function () {
        return this.internalHint;
      }
    , set: function (v) {
        this.internalHint = this.normalizeHintField(v);
      }
  });
};

/**
 * Inserts `docs` into the db.
 *
 * @param {Array|Object} docs
 * @param {Object} options (optional)
 * @param {Function} callback (optional)
 * @return {Collection}
 */

Collection.prototype.insert = function insert (docs, options, callback) {
  if ('function' === typeof options) callback = options, options = {};

  this.insertAll(Array.isArray(docs) ? docs : [docs], options, callback);

  return this;
};

/**
 * Checks if `collectionName` is valid.
 *
 * @param {String} collectionName
 */

Collection.prototype.checkCollectionName = function checkCollectionName (collectionName) {
  if ('string' !== typeof collectionName) {
    throw Error("collection name must be a String");
  }

  if (!collectionName || collectionName.indexOf('..') != -1) {
    throw Error("collection names cannot be empty");
  }

  if (collectionName.indexOf('$') != -1 &&
      collectionName.match(/((^\$cmd)|(oplog\.\$main))/) == null) {
    throw Error("collection names must not contain '$'");
  }

  if (collectionName.match(/^\.|\.$/) != null) {
    throw Error("collection names must not start or end with '.'");
  }
};

/**
 * Removes documents specified by `selector` from the db.
 * @param {Object} selector (optional)
 * @param {Object} options (optional)
 * @param {Function} callback (optional)
 */

Collection.prototype.remove = function remove (selector, options, callback) {
  if ('function' === typeof selector) {
    callback = selector;
    selector = options = {};
  } else if ('function' === typeof options) {
    callback = options;
    options = {};
  }

  var deleteCommand = new DeleteCommand(
      this.db
    , this.db.databaseName + "." + this.collectionName
    , selector);

  // Execute the command, do not add a callback as it's async
  if (options && options.safe || this.opts.safe != null || this.db.strict) {
    var errorOptions = options.safe != null ? options.safe : null;
    errorOptions = errorOptions == null && this.opts.safe != null ? this.opts.safe : errorOptions;
    errorOptions = errorOptions == null && this.db.strict != null ? this.db.strict : errorOptions;
    // Execute command with safe options (rolls up both command and safe command into one and executes them on the same connection)
    this.db.executeCommand(deleteCommand, {read:false, safe: errorOptions}, function (err, error) {
      error = error && error.documents;
      if(!callback) return;      

      if (err) {
        callback(err);
      } else if (error[0].err) {
        callback(new Error(error[0].err));
      } else {
        callback(null, error[0].n);
      }      
    });    
  } else {
    var result = this.db.executeCommand(deleteCommand);    
    // If no callback just return
    if (!callback) return;
    // If error return error
    if (result instanceof Error) {
      return callback(result);
    }
    // Otherwise just return
    return callback();
  }
};

/**
 * Renames the collection.
 *
 * @param {String} newName
 * @param {Function} callback
 */

Collection.prototype.rename = function rename (newName, callback) {
  var self = this;

  try {
    this.checkCollectionName(newName);
    this.db.renameCollection(this.collectionName, newName, function (err, result) {
      if (err) {
        callback(err);
      } else if (result.documents[0].ok == 0) {
        callback(new Error(result.documents[0].errmsg));
      } else {
        self.db.collection(newName, callback);
      }
    });
  } catch (err) {
    callback(err);
  }
};

/**
 * Insert many docs into the db.
 *
 * @param {Array} docs
 * @param {Object} options (optional)
 * @param {Function} callback (optional)
 */

Collection.prototype.insertAll = function insertAll (docs, options, callback) {
  if ('function' === typeof options) callback = options, options = {};

  var insertCommand = new InsertCommand(
      this.db
    , this.db.databaseName + "." + this.collectionName);

  // Add the documents and decorate them with id's if they have none
  for (var index = 0, len = docs.length; index < len; ++index) {
    var doc = docs[index];

    // Add id to each document if it's not already defined
    if (!doc['_id'] && this.db.forceServerObjectId != true) {
      doc['_id'] = this.pkFactory.createPk();
    }

    insertCommand.add(doc);
  }
  
  // If safe is defined check for error message
  if (options != null && (options.safe == true || this.db.strict == true || this.opts.safe == true)) {
    var errorOptions = options.safe != null ? options.safe : null;
    errorOptions = errorOptions == null && this.opts.safe != null ? this.opts.safe : errorOptions;
    errorOptions = errorOptions == null && this.db.strict != null ? this.db.strict : errorOptions;

    // Insert options
    var insertOptions = {read:false, safe: errorOptions};
    // If we have safe set set async to false
    if(errorOptions == null) insertOptions['async'] = true;
    // Execute command with safe options (rolls up both command and safe command into one and executes them on the same connection)
    this.db.executeCommand(insertCommand, insertOptions, function (err, error) {
      error = error && error.documents;
      if(!callback) return;      

      if (err) {
        callback(err);
      } else if (error[0].err) {
        callback(new Error(error[0].err));
      } else {
        callback(null, docs);
      }      
    });    
  } else {
    var result = this.db.executeCommand(insertCommand);    
    // If no callback just return
    if (!callback) return;
    // If error return error
    if (result instanceof Error) {
      return callback(result);
    }
    // Otherwise just return
    return callback(null, docs);
  }
};

/**
 * Save a document.
 *
 * @param {Object} doc
 * @param {Object} options (optional)
 * @param {Function} callback (optional)
 */

Collection.prototype.save = function save (doc, options, callback) {
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  options = args.length ? args.shift() : {};

  var errorOptions = options.safe != null ? options.safe : false;    
  errorOptions = errorOptions == null && this.opts.safe != null ? this.opts.safe : errorOptions;
  
  var id = doc['_id'];

  if (id) {
    this.update({ _id: id }, doc, { upsert: true, safe: errorOptions }, callback);
  } else {
    this.insert(doc, { safe: errorOptions }, callback && function (err, docs) {
      if (err) return callback(err, null);

      if (Array.isArray(docs)) {
        callback(err, docs[0]);
      } else {
        callback(err, docs);
      }
    });
  }
};

/**
 * Updates documents.
 *
 * By default updates only the first found doc. To update all matching
 * docs in the db, set options.multi to true.
 *
 * @param {Object} selector
 * @param {Object} document - the fields/vals to be updated, or in the case of
 *                            an upsert operation, inserted.
 * @param {Object} options (optional)
 *    upsert - {bool} perform an upsert operation
 *    multi  - {bool} update all documents matching the selector
 *    safe   - {bool} check if the update failed (requires extra call to db)
 * @param {Function} callback (optional)
 */

Collection.prototype.update = function update (selector, document, options, callback) {
  if('function' === typeof options) callback = options, options = null;

  var updateCommand = new UpdateCommand(
      this.db
    , this.db.databaseName + "." + this.collectionName
    , selector
    , document
    , options);

  // If we are executing in strict mode or safe both the update and the safe command must happen on the same line
  if (options && options.safe || this.db.strict || this.opts.safe) {
    // Unpack the error options if any
    var errorOptions = (options && options.safe != null) ? options.safe : null;    
    errorOptions = errorOptions == null && this.opts.safe != null ? this.opts.safe : errorOptions;
    errorOptions = errorOptions == null && this.db.strict != null ? this.db.strict : errorOptions;
    
    // Execute command with safe options (rolls up both command and safe command into one and executes them on the same connection)
    this.db.executeCommand(updateCommand, {read:false, safe: errorOptions}, function (err, error) {
      error = error && error.documents;
      if(!callback) return;      
      
      if (err) {
        callback(err);
      } else if (error[0].err) {
        callback(new Error(error[0].err));
      } else {
        callback(null, error[0].n);
      }      
    });    
  } else {
    var result = this.db.executeCommand(updateCommand);    
    // If no callback just return
    if (!callback) return;
    // If error return error
    if (result instanceof Error) {
      return callback(result);
    }
    // Otherwise just return
    return callback();
  }
};

/**
 * Fetch a distinct collection
 * @param {String} key
 * @param {Object} query (optional)
 * @param {Function} callback (optional)
 */

Collection.prototype.distinct = function distinct (key, query, callback) {
  if ('function' === typeof query) callback = query, query = {};

  var mapCommandHash = {
      distinct: this.collectionName
    , query: query
    , key: key
  };

  var cmd = DbCommand.createDbCommand(this.db, mapCommandHash);

  this.db.executeCommand(cmd, {read:true}, function (err, result) {
    if (err) {
      return callback(err);
    }

    if (result.documents[0].ok != 1) {
      return callback(new Error(result.documents[0].errmsg));
    }

    callback(null, result.documents[0].values);
  });
};

/**
 * Count number of matching documents in the db.
 *
 * @param {Object} query
 * @param {Function} callback
 */

Collection.prototype.count = function count (query, callback) {
  if ('function' === typeof query) callback = query, query = {};

  var final_query = {
      count: this.collectionName
    , query: query
    , fields: null
  };

  var queryCommand = new QueryCommand(
      this.db
    , this.db.databaseName + ".$cmd"
    , QueryCommand.OPTS_NO_CURSOR_TIMEOUT
    , 0
    , -1
    , final_query
    , null
  );

  this.db.executeCommand(queryCommand, {read:true}, function (err, result) {
    if (err) {
      callback(err);
    } else if (result.documents[0].ok != 1) {
      callback(new Error(result.documents[0].errmsg));
    } else {
      callback(null, result.documents[0].n);
    }
  });
};

/**
 * Drop this collection.
 *
 * @param {Function} callback
 */

Collection.prototype.drop = function drop (callback) {
  this.db.dropCollection(this.collectionName, callback);
};

/**
 * Find and update a document.
 *
 * @param {Object} query
 * @param {Array}  sort - if multiple docs match, choose the first one
 *                        in the specified sort order as the object to manipulate
 * @param {Object} doc - the fields/vals to be updated
 * @param {Object} options -
 *        remove: {Bool} set to true to remove the object before returning
 *        upsert: {Bool} perform an upsert operation
 *        new:    {Bool} set to true if you want to return the modified object
 *                       rather than the original. Ignored for remove.
 * @param {Function} callback
 */

Collection.prototype.findAndModify = function findAndModify (query, sort, doc, options, callback) {
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  sort = args.length ? args.shift() : [];
  doc = args.length ? args.shift() : null;
  options = args.length ? args.shift() : {};

  var queryObject = {
      'findandmodify': this.collectionName
    , 'query': query
    , 'sort': formattedOrderClause(sort)
  };

  queryObject.new = options.new ? 1 : 0;
  queryObject.remove = options.remove ? 1 : 0;
  queryObject.upsert = options.upsert ? 1 : 0;

  if (options.fields) {
    queryObject.fields = options.fields;
  }

  if (doc && !options.remove) {
    queryObject.update = doc;
  }

  this.db.executeDbCommand(queryObject, function (err, doc) {
    if (err) {
      callback(err, doc)
    } else {
      callback(err, doc.documents[0].value)
    }
  });
}

/**
 * Various argument possibilities
 * TODO : combine/reduce # of possibilities
 * 1 callback?
 * 2 selector, callback?,
 * 2 callback?, options  // really?!
 * 3 selector, fields, callback?
 * 3 selector, options, callback?
 * 4,selector, fields, options, callback?
 * 5 selector, fields, skip, limit, callback?
 * 6 selector, fields, skip, limit, timeout, callback?
 *
 * Available options:
 * limit, sort, fields, skip, hint, explain, snapshot, timeout, tailable, batchSize
 */

Collection.prototype.find = function find () {
  var options
    , args = Array.prototype.slice.call(arguments, 0)
    , has_callback = typeof args[args.length - 1] === 'function'
    , has_weird_callback = typeof args[0] === 'function'
    , callback = has_callback ? args.pop() : (has_weird_callback ? args.shift() : null)
    , len = args.length
    , selector = len >= 1 ? args[0] : {}
    , fields = len >= 2 ? args[1] : undefined;

  if (len === 1 && has_weird_callback) {
    // backwards compat for callback?, options case
    selector = {};
    options = args[0];
  }

  if (len === 2) {
    // backwards compat for options object
    var test = ['limit','sort','fields','skip','hint','explain','snapshot','timeout','tailable', 'batchSize']
      , is_option = false;

    for (var idx = 0, l = test.length; idx < l; ++idx) {
      if (test[idx] in fields) {
        is_option = true;
        break;
      }
    }

    if (is_option) {
      options = fields;
      fields = undefined;
    } else {
      options = {};
    }
  }

  if (3 === len) {
    options = args[2];
  }

  if (options && options.fields) {
    fields = {};
    if (Array.isArray(options.fields)) {
      if (!options.fields.length) {
        fields['_id'] = 1;
      } else {
        for (var i = 0, l = options.fields.length; i < l; i++) {
          fields[options.fields[i]] = 1;
        }
      }
    } else {
      fields = options.fields;
    }
  }

  if (!options) options = {};

  options.skip = len > 3 ? args[2] : options.skip ? options.skip : 0;
  options.limit = len > 3 ? args[3] : options.limit ? options.limit : 0;
  options.hint = options.hint != null ? this.normalizeHintField(options.hint) : this.internalHint;
  options.timeout = len == 5 ? args[4] : options.timeout ? options.timeout : undefined;
  // If we have overridden slaveOk otherwise use the default db setting
  options.slaveOk = options.slaveOk != null ? options.slaveOk : this.db.slaveOk;

  var o = options;

  // callback for backward compatibility
  if (callback) {
    // TODO refactor Cursor args
    callback(null, new Cursor(this.db, this, selector, fields, o.skip, o.limit, o.sort, o.hint, o.explain, o.snapshot, o.timeout, o.tailable, o.batchSize, o.slaveOk));
  } else {
    return new Cursor(this.db, this, selector, fields, o.skip, o.limit, o.sort, o.hint, o.explain, o.snapshot, o.timeout, o.tailable, o.batchSize, o.slaveOk);
  }
};

/**
 * Normalizes a `hint` argument.
 *
 * @param {String|Object|Array} hint
 * @return {Object}
 */

Collection.prototype.normalizeHintField = function normalizeHintField (hint) {
  var finalHint = null;

  if (null != hint) {
    switch (hint.constructor) {
      case String:
        finalHint = {};
        finalHint[hint] = 1;
        break;
      case Object:
        finalHint = {};
        for (var name in hint) {
          finalHint[name] = hint[name];
        }
        break;
      case Array:
        finalHint = {};
        hint.forEach(function(param) {
          finalHint[param] = 1;
        });
        break;
    }
  }

  return finalHint;
};

/**
 * Finds one document.
 *
 * @param {Object} queryQbject
 * @param {Object} options
 * @param {Function} callback
 */

Collection.prototype.findOne = function findOne (queryObject, options, callback) {
  if ('function' === typeof queryObject) {
    callback = queryObject;
    queryQbject = {};
    options = {};
  } else if ('function' === typeof options) {
    callback = options;
    options = {};
  }

  var fields;

  if (options.fields && Array.isArray(options.fields)) {
    fields = {};
    if (0 === options.fields.length) {
      fields['_id'] = 1;
    } else {
      for (var i = 0, len = options.fields.length; i < len; ++i) {
        fields[options.fields[i]] = 1;
      }
    }
  } else {
    fields = options.fields;
  }

  if (queryObject instanceof this.db.bson_serializer.ObjectID ||
     '[object ObjectID]' === toString.call(queryObject)) {
    queryObject = { '_id': queryObject };
  }

  var query = { 'query': queryObject };

  var timeout = null != options.timeout
    ? options.timeout
    : QueryCommand.OPTS_NONE;

  var collectionName = (this.db.databaseName ? this.db.databaseName + '.' : '')
                     + this.collectionName;

  var queryCommand = new QueryCommand(
      this.db
    , collectionName
    , timeout
    , 0
    , 1
    , query
    , fields);

  this.db.executeCommand(queryCommand, {read:true}, function (err, result) {
    if (!err && result.documents[0] && result.documents[0]['$err']) {
      return callback(result.documents[0]['$err']);
    }

    callback(err, result && result.documents && result.documents[0]);
  });
};

/**
 * Creates an index on this collection.
 *
 * @param {Object} fieldOrSpec
 * @param {Object} options
 * @param {Function} callback
 */

Collection.prototype.createIndex = function createIndex (fieldOrSpec, options, callback) {
  this.db.createIndex(this.collectionName, fieldOrSpec, options, callback);
};

/**
 * Ensures the index exists on this collection.
 *
 * @param {Object} fieldOrSpec
 * @param {Object} options
 * @param {Function} callback
 */

Collection.prototype.ensureIndex = function ensureIndex (fieldOrSpec, options, callback) {
  this.db.ensureIndex(this.collectionName, fieldOrSpec, options, callback);
};

/**
 * Retrieves this collections index info.
 *
 * @param {Function} callback
 */

Collection.prototype.indexInformation = function indexInformation (callback) {
  this.db.indexInformation(this.collectionName, callback);
};

/**
 * Drops an index from this collection.
 *
 * @param {String} name
 * @param {Function} callback
 */

Collection.prototype.dropIndex = function dropIndex (name, callback) {
  this.db.dropIndex(this.collectionName, name, callback);
};

/**
 * Drops all indexes from this collection.
 *
 * @param {Function} callback
 */

Collection.prototype.dropIndexes = function dropIndexes (callback) {
  this.db.dropIndex(this.collectionName, '*', function (err, result) {
    if (err) {
      callback(err);
    } else if (1 == result.documents[0].ok) {
      callback(null, true);
    } else {
      callback(new Error("map-reduce failed: " + result.documents[0].errmsg), false);
    }
  });
};

/**
 * Map reduce.
 *
 * @param {Function|String} map
 * @param {Function|String} reduce
 * @param {Objects} options
 * @param {Function} callback
 */

Collection.prototype.mapReduce = function mapReduce (map, reduce, options, callback) {
  if ('function' === typeof options) callback = options, options = {};

  // Set default to be inline if we are dealing with a v 1.7.6 > server
  var version = 'string' === typeof this.db.version
    ? parseInt(this.db.version.replace(/\./g, ''))
    : 0;

  if (version > 0 && version > 176) {
    if (null == options.out) options.out = 'inline';
  }

  if ('function' === typeof map) {
    map = map.toString();
  }

  if ('function' === typeof reduce) {
    reduce = reduce.toString();
  }

  if ('function' === typeof options.finalize) {
    options.finalize = options.finalize.toString();
  }

  var mapCommandHash = {
      mapreduce: this.collectionName
    , map: map
    , reduce: reduce
  };

  // Add any other options passed in
  for (var name in options) {
    mapCommandHash[name] = options[name];
  }

  var self = this;
  var cmd = DbCommand.createDbCommand(this.db, mapCommandHash);

  this.db.executeCommand(cmd, {read:true}, function (err, result) {
    if (err) {
      return callback(err);
    }

    if (1 != result.documents[0].ok) {
      return callback(result.documents[0]);
    }

    // invoked with inline?
    if (result.documents[0].results) {
      return callback(null, result.documents[0].results);
    }

    // Create a collection object that wraps the result collection
    self.db.collection(result.documents[0].result, function (err, collection) {
      if (!options.include_statistics) {
        return callback(err, collection);
      }

      var stats = {
          processtime: result.documents[0].timeMillis
        , counts: result.documents[0].counts
      };
      
      callback(err, collection, stats);
    });
  });
};

/**
 * Group function helper
 */

var groupFunction = function () {
  var c = db[ns].find(condition);
  var map = new Map();
  var reduce_function = reduce;

  while (c.hasNext()) {
    var obj = c.next();
    var key = {};

    for (var i = 0, len = keys.length; i < len; ++i) {
      var k = keys[i];
      key[k] = obj[k];
    }

    var aggObj = map.get(key);

    if (aggObj == null) {
      var newObj = Object.extend({}, key);
      aggObj = Object.extend(newObj, initial);
      map.put(key, aggObj);
    }

    reduce_function(obj, aggObj);
  }

  return { "result": map.values() };
}.toString();

/**
 * Group.
 *
 * @param {Object|Array|Function|Code} keys
 * @param {TODO} condition
 * @param {TODO} initial
 * @param {Function|Code} reduce
 * @param {Boolean} command
 * @param {Function} callback
 */

Collection.prototype.group = function group (keys, condition, initial, reduce, command, callback) {
  var args = Array.prototype.slice.call(arguments, 3);
  callback = args.pop();
  reduce = args.length ? args.shift() : null;
  command = args.length ? args.shift() : null;

  var Code = this.db.bson_serializer.Code
  
  if (!Array.isArray(keys) && keys instanceof Object && typeof(keys) !== 'function') {
    keys = Object.keys(keys);
  }

  if (reduce instanceof Function) {
    reduce = reduce.toString();
  }
  
  if (command) {
    var reduceFunction = reduce instanceof Code
        ? reduce
        : new Code(reduce);

    var selector = {
      group: {
          'ns': this.collectionName
        , '$reduce': reduceFunction
        , 'cond': condition
        , 'initial': initial
      }
    };

    if ('function' === typeof keys) {
      selector.group.$keyf = keys instanceof Code
        ? keys
        : new Code(keys);
    } else {
      var hash = {};
      keys.forEach(function (key) {
        hash[key] = 1;
      });
      selector.group.key = hash;
    }

    var cmd = DbCommand.createDbCommand(this.db, selector);

    this.db.executeCommand(cmd, {read:true}, function (err, result) {
      if (err) return callback(err);

      var document = result.documents[0];
      if (null == document.retval) {
        return callback(new Error("group command failed: " + document.errmsg));
      }

      callback(null, document.retval);
    });

  } else {
    // Create execution scope
    var scope = reduce != null && reduce instanceof Code
      ? reduce.scope
      : {};

    scope.ns = this.collectionName;
    scope.keys = keys;
    scope.condition = condition;
    scope.initial = initial;

    // Pass in the function text to execute within mongodb.
    var groupfn = groupFunction.replace(/ reduce;/, reduce.toString() + ';');

    this.db.eval(new Code(groupfn, scope), function (err, results) {
      if (err) return callback(err, null);
      callback(null, results.result || results);
    });
  }
};

/**
 * Options.
 *
 * @param {Function} callback
 */

Collection.prototype.options = function options (callback) {
  this.db.collectionsInfo(this.collectionName, function (err, cursor) {
    if (err) return callback(err);
    cursor.nextObject(function (err, document) {
      callback(err, document && document.options || null);
    });
  });
};

/**
 * Expose.
 */

exports.Collection = Collection;
