var InsertCommand = require('./commands/insert_command').InsertCommand,
  QueryCommand = require('./commands/query_command').QueryCommand,
  DeleteCommand = require('./commands/delete_command').DeleteCommand,
  UpdateCommand = require('./commands/update_command').UpdateCommand,
  DbCommand = require('./commands/db_command').DbCommand,
  BinaryParser = require('./bson/binary_parser').BinaryParser,
  Cursor = require('./cursor').Cursor;


/**
  Sort functions, Normalize and prepare sort parameters
**/
var formatSortValue = function(sortDirection) {
  var value = ("" + sortDirection).toLowerCase();
  if(value == 'ascending' || value == 'asc' || value == 1) return 1;
  if(value == 'descending' || value == 'desc' || value == -1 ) return -1;
  throw new Error("Illegal sort clause, must be of the form " +
    "[['field1', '(ascending|descending)'], ['field2', '(ascending|descending)']]");
};

var formattedOrderClause = function(sortValue) {
  var orderBy = {};
  var self = this;

  if(Array.isArray(sortValue)) {
    sortValue.forEach(function(sortElement) {
      if(sortElement.constructor == String) {
        orderBy[sortElement] = 1;
      } else {
        orderBy[sortElement[0]] = formatSortValue(sortElement[1]);
      }
    });
  } else if(sortValue.constructor == String) {
    orderBy[sortValue] = 1;
  } else {
    throw new Error("Illegal sort clause, must be of the form " +
      "[['field1', '(ascending|descending)'], ['field2', '(ascending|descending)']]");
  }
  return orderBy;
};

/**
  Handles all the operations on objects in collections
**/
var Collection = exports.Collection = function(db, collectionName, pkFactory) {
  this.db = db;
  this.collectionName = collectionName;
  this.internalHint;
  this.pkFactory = pkFactory == null ? db.bson_serializer.ObjectID : pkFactory;
  // Add getter and setters
  this.__defineGetter__("hint", function() { return this.internalHint; });
  this.__defineSetter__("hint", function(value) { this.internalHint = this.normalizeHintField(value); });
  // Ensure the collection name is not illegal
  this.checkCollectionName(collectionName);
};

Collection.prototype.insert = function(docs, options, callback) {
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  
  if(Object.prototype.toString.call(callback) != '[object Function]') {
    args.push(callback)
    callback = null
  }
  
  options = args.length ? args.shift() : {};
  this.insertAll(Array.isArray(docs) ? docs : [docs], options, callback);
  return this;
};

Collection.prototype.checkCollectionName = function(collectionName) {
  if (typeof collectionName != 'string')
    throw Error("collection name must be a String");

  if (!collectionName || collectionName.indexOf('..') != -1)
    throw Error("collection names cannot be empty");

  if (collectionName.indexOf('$') != -1 && collectionName.match(/((^\$cmd)|(oplog\.\$main))/) == null)
    throw Error("collection names must not contain '$'");

  if (collectionName.match(/^\.|\.$/) != null)
    throw Error("collection names must not start or end with '.'");
};

Collection.prototype.remove = function(selector, options, callback) {
  var args = Array.prototype.slice.call(arguments, 0);
  callback = args.pop();
  var removeSelector = args.length ? args.shift() : {};
  options = args.length ? args.shift() : {};

  // Generate selector for remove all if not available
  var deleteCommand = new DeleteCommand(this.db, this.db.databaseName + "." + this.collectionName, removeSelector);
  // Execute the command, do not add a callback as it's async
  var result = this.db.executeCommand(deleteCommand);
  if(result instanceof Error) {
    if(callback != null) return callback(result, null);
  }
  
  // If safe mode check last error
  if(callback != null) {
    if(options.safe || this.db.strict) {
      this.db.error(function(err, error) {
        if(error[0].err) {
          callback(new Error(error[0].err), null);
        } else {
          callback(null, null);
        }
      });
    } else {
      // Callback with no error check
      callback(null, this);
    }
  }
};

Collection.prototype.rename = function(collectionName, callback) {
  var self = this;

  try {
    this.checkCollectionName(collectionName);
    this.db.renameCollection(this.collectionName, collectionName, function(err, result) {
      if(err != null || result.documents[0].ok == 0) {
        err != null ? callback(err, null) : callback(new Error(result.documents[0].errmsg), null);
      } else {
        // Set collectionname to new one and return the collection
        self.db.collection(collectionName, callback);
      }
    });
  } catch(err) {
    callback(err, null);
  }
};

Collection.prototype.insertAll = function(docs, options, callback) {
  var self = this;
  var error= null;
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();

  if(Object.prototype.toString.call(callback) != '[object Function]') {
    args.push(callback)
    callback = null
  }

  options = args.length ? args.shift() : {};

  // List of all id's inserted
  var objects = [];
  // Create an insert command
  var insertCommand = new InsertCommand(this.db, this.db.databaseName + "." + this.collectionName);
  // Add id to each document if it's not already defined
  for(var index = 0; index < docs.length; index++) {
    var doc = docs[index];
    // Add the id to the document
    var id = doc["_id"] == null ? this.pkFactory.createPk() : doc["_id"];
    doc['_id'] = id;
    // Insert the document
    insertCommand.add(doc);
    objects.push(doc);
  }
  // Execute the command
  var result = this.db.executeCommand(insertCommand);
  if(result instanceof Error) {
    if(callback != null) return callback(result, null);
  }
    
  // If safe is defined check for error message
  if(callback != null) {
    if(options.safe || this.db.strict) {
      this.db.error(function(err, error) {
        if(error[0].err) {
          if(callback != null) callback(new Error(error[0].err), null);
        } else {
          if(callback != null) callback(null, objects);
        }
      });
    } else {
      if(callback != null) callback(null, objects);
    }
  }
};

Collection.prototype.save = function(doc, options, callback) {
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();

  if(Object.prototype.toString.call(callback) != '[object Function]') {
    args.push(callback)
    callback = null
  }

  options = args.length ? args.shift() : null;
  var id = doc['_id'];

  if(id != null) {
    this.update({'_id':id}, doc, {upsert: true, safe: options != null ? options.safe : false}, callback);
  } else {
    this.insert(doc, {safe: options != null ? options.safe : false}, function(err, docs) { Array.isArray(docs) ? callback(err, docs[0]) : callback(err, docs); });
  }
};

/**
  Update a single document in this collection.
    spec - a associcated array containing the fields that need to be present in
      the document for the update to succeed

    document - an associated array with the fields to be updated or in the case of
      a upsert operation the fields to be inserted.

  Options:
    upsert - true/false (perform upsert operation)
    multi - true/false (update all documents matching spec)
    safe - true/false (perform check if the operation failed, required extra call to db)
**/
Collection.prototype.update = function(spec, document, options, callback) {
  var args = Array.prototype.slice.call(arguments, 2);
  callback = args.pop();

  if(Object.prototype.toString.call(callback) != '[object Function]') {
    args.push(callback)
    callback = null
  }

  options = args.length ? args.shift() : null;
  var safe = options == null || options.safe == null || options.safe == false ? false : true;
  var upsert = options == null || options.upsert == null || options.upsert == false ? false : true;
  // Create update command
  var updateCommand = new UpdateCommand(this.db, this.db.databaseName + "." + this.collectionName, spec, document, options);
  // Execute command
  var result = this.db.executeCommand(updateCommand);;
  if(result instanceof Error) {
    if(callback != null) return callback(result, null);
  }

  // If safe, we need to check for successful execution
  if(safe || this.db.strict) {
    this.db.error(function(err, error) {
      if(callback != null) {
        if (upsert) {
          // Document was either inserted or updated, simply pass on the error if one occurred.
          if (error[0].err) {
            if(callback != null) callback(new Error(error[0].err), null);
          } else {
            if(callback != null) callback(null, document);
          }
        } else {
          // Update only doesn't return an error when the record to be updated doesn't exist.
          if(error[0].updatedExisting == false) {
            if(callback != null) callback(new Error("Failed to update document"), null);
          } else {
            // If another kind of error occurred then report it to the callback function.
            if (error[0].err) {
              if(callback != null) callback(new Error(error[0].err), null);
            } else {
              if(callback != null) callback(null, document);
            }
          }
        }
      }
    });
  } else {
    // Call back with ok if no error found
    if(callback != null) callback(null, document);
  }
};

/**
  Fetch a distinct collection
**/
Collection.prototype.distinct = function(key, query, callback) {
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  query = args.length ? args.shift() : {};

  var mapCommandHash = {distinct:this.collectionName, key:key, query:query};
  this.db.executeCommand(DbCommand.createDbCommand(this.db, mapCommandHash), function(err, result) {
    if(err == null && result.documents[0].ok == 1) {
      callback(null, result.documents[0].values);
    } else {
      err != null ? callback(err, null) : callback(new Error(result.documents[0].errmsg), null);
    }
  });
};

Collection.prototype.count = function(query, callback) {
  if(typeof query === "function") { callback = query; query = null; }
  var query_object = query == null ? {} : query;
  var final_query = {count: this.collectionName, query: query_object, fields: null};
  var queryCommand = new QueryCommand(this.db, this.db.databaseName + ".$cmd", QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, final_query, null);
  // Execute the command
  this.db.executeCommand(queryCommand, function(err, result) {
    if(err == null && result.documents[0].ok == 1) {
      callback(null, result.documents[0].n);
    } else {
      err != null ? callback(err, null) : callback(new Error(result.documents[0].errmsg), null);
    }
  });
};

Collection.prototype.drop = function(callback) {
  this.db.dropCollection(this.collectionName, callback);
};

/**
  Fetch and update a collection
  query:        a filter for the query
  sort:         if multiple docs match, choose the first one in the specified sort order as the object to manipulate
  update:       an object describing the modifications to the documents selected by the query
  options:
    remove:   set to a true to remove the object before returning
    new:      set to true if you want to return the modified object rather than the original. Ignored for remove.
    upsert:       true/false (perform upsert operation)
**/
Collection.prototype.findAndModify = function(query, sort, update, options, callback) {
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  sort = args.length ? args.shift() : [];
  update = args.length ? args.shift() : null;
  options = args.length ? args.shift() : {};

  // Format the sort object
  var sort_object = formattedOrderClause(sort);
  // Unpack the options
  var queryOptions = QueryCommand.OPTS_NONE;
  // Build the query object for the findAndModify
  var queryObject = {
    'findandmodify': this.collectionName,
    'query':query,
    'sort':sort_object
  }

  queryObject['new'] = options['new'] ? 1 : 0;
  queryObject['remove'] = options.remove ? 1 : 0;
  queryObject['upsert'] = options.upsert ? 1 : 0;
  if (options.fields) queryObject['fields'] = options.fields;

  // Set up the update if it exists
  if(update) queryObject['update'] = update;

  // Set up the sort
  if(!Array.isArray(sort) && sort.length == 0) queryObject['sort'] = sort_object;

  if(options.remove) delete queryObject['update'];

  // Execute command
  this.db.executeDbCommand(queryObject, function(err, doc) {
    err ? callback(err, doc) : callback(err, doc.documents[0].value);
  });
}

/**
 * Various argument possibilities
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
Collection.prototype.find = function() {
  var options,
      args = Array.prototype.slice.call(arguments, 0),
      has_callback = typeof args[args.length - 1] === 'function',
      has_weird_callback = typeof args[0] === 'function',
      callback = has_callback ? args.pop() : (has_weird_callback ? args.shift() : null),
      len = args.length,
      selector = (len >= 1) ? args[0] : {},
      fields = (len >= 2) ? args[1] : undefined;

  if(len == 1 && has_weird_callback) { // backwards compat for callback?, options case
    selector = {};
    options = args[0];
  }

  if(len == 2){ // backwards compat for options object
    var test = ['limit','sort','fields','skip','hint','explain','snapshot','timeout','tailable', 'batchSize'],
        idx = 0, l = test.length, is_option = false;
    while(!is_option && idx < l) if(test[idx] in fields ) is_option = true; else idx++;
    options = is_option ? fields : {};
    if(is_option) fields = undefined;
  }
  if(len == 3) options = args[2];

  if(options && options.fields){
    fields = {};
    if(options.fields.constructor == Array){
      if(options.fields.length == 0) fields['_id'] = 1;
      else for(var i = 0, l = options.fields.length; i < l; i++) fields[options.fields[i]] = 1;
    }
    else fields = options.fields;
  }
  if(!options) options = {};

  options.skip = len > 3 ? args[2] : options.skip ? options.skip : 0;
  options.limit = len > 3 ? args[3] : options.limit ? options.limit : 0;
  options.hint = options.hint != null ? this.normalizeHintField(options.hint) : this.internalHint;
  options.timeout = len == 5 ? args[4] : options.timeout ? options.timeout : undefined;
  options.slaveOk = options.slaveOk != null ? options.slaveOk : false;

  var o = options;

  // callback for backward compatibility
  if (callback) {
    callback(null, new Cursor(this.db, this, selector, fields, o.skip, o.limit, o.sort, o.hint, o.explain, o.snapshot, o.timeout, o.tailable, o.batchSize, o.slaveOk));
  } else {
    return new Cursor(this.db, this, selector, fields, o.skip, o.limit, o.sort, o.hint, o.explain, o.snapshot, o.timeout, o.tailable, o.batchSize, o.slaveOk);
  }
};

Collection.prototype.normalizeHintField = function(hint) {
  var finalHint = null;
  // Normalize the hint parameter
  if(hint != null && hint.constructor == String) {
    finalHint = {};
    finalHint[hint] = 1;
  } else if(hint != null && hint.constructor == Object) {
    finalHint = {};
    for(var name in hint) { finalHint[name] = hint[name]; }
  } else if(hint != null && hint.constructor == Array) {
    finalHint = {};
    hint.forEach(function(param) { finalHint[param] = 1; });
  }
  return finalHint;
};

Collection.prototype.findOne = function(queryObject, options, callback) {
  var args = Array.prototype.slice.call(arguments, 0);
  callback = args.pop();
  queryObject = args.length ? args.shift() : {};
  options = args.length ? args.shift() : {};

  var fields = options.fields;
  // Normalize fields filtering
  if(options && options.fields){
    fields = {};
    if(options.fields.constructor == Array){
      if(options.fields.length == 0) fields['_id'] = 1;
      else for(var i = 0, l = options.fields.length; i < l; i++) fields[options.fields[i]] = 1;
    }
    else fields = options.fields;
  }
  // Unpack the options
  var timeout = options.timeout != null ? options.timeout : QueryCommand.OPTS_NONE;
  var queryOptions = timeout;
  // Build final query
  var finalQueryObject = queryObject == null ? {} : queryObject;
  // Validate the type of query
  finalQueryObject = (finalQueryObject instanceof this.db.bson_serializer.ObjectID || Object.prototype.toString.call(finalQueryObject) === '[object ObjectID]') ? {'_id':finalQueryObject} : finalQueryObject;
  // Build special selector
  var specialSelector = {'query':finalQueryObject};
  // Build full collection name
  var collectionName = (this.db.databaseName ? this.db.databaseName + "." : '') + this.collectionName;
  // Execute the command
  var queryCommand = new QueryCommand(this.db, collectionName, queryOptions, 0, 1, specialSelector, fields);
  this.db.executeCommand(queryCommand, function(err, result) {
    if(!err && result.documents[0] && result.documents[0]['$err']) return callback(result.documents[0]['$err'], null);
    callback(err, result.documents[0]);
  });
};

Collection.prototype.createIndex = function(fieldOrSpec, unique, callback) {
  this.db.createIndex(this.collectionName, fieldOrSpec, unique, callback);
};

Collection.prototype.ensureIndex = function(fieldOrSpec, unique, callback) {
  this.db.ensureIndex(this.collectionName, fieldOrSpec, unique, callback);
};

Collection.prototype.indexInformation = function(callback) {
  this.db.indexInformation(this.collectionName, callback);
};

Collection.prototype.dropIndex = function(indexName, callback) {
  this.db.dropIndex(this.collectionName, indexName, callback);
};

Collection.prototype.dropIndexes = function(callback) {
  this.db.dropIndex(this.collectionName, "*", function(err, result) {
    if(err == null && result.documents[0].ok == 1) {
      callback(null, true);
    } else {
      err != null ? callback(err, null) : callback(new Error("map-reduce failed: " + result.documents[0].errmsg), false);
    }
  });
};

Collection.prototype.mapReduce = function(map, reduce, options, callback) {
  var args = Array.prototype.slice.call(arguments, 2);
  callback = args.pop();
  var self = this;
  // Parse version of server if available
  var version = this.db.version != null ? parseInt(this.db.version.replace(/\./g, '')) : 0;
  
  // Set default to be inline if we are dealing with a v 1.7.6 > server
  if(version > 0 && version > 176) {
    options = args.length ? args.shift() : {out:'inline'};
    if(options.out == null) options.out = 'inline';
  }

  if(Object.prototype.toString.call(map) === '[object Function]') map = map.toString();
  if(Object.prototype.toString.call(reduce) === '[object Function]') reduce = reduce.toString();
  // Build command object for execution
  var mapCommandHash = {mapreduce:this.collectionName, map:map, reduce:reduce};
  // Add any other options passed in
  for(var name in options) {
    mapCommandHash[name] = options[name];
  }
  // Execute command against server
  this.db.executeCommand(DbCommand.createDbCommand(this.db, mapCommandHash), function(err, result) {
    if(err == null && result.documents[0].ok == 1) {
      //return the results, if the map/reduce is invoked with inline option
      if(result.documents[0].results)  {
      	return callback(err, result.documents[0].results);
      }
      // Create a collection object that wraps the result collection
      self.db.collection(result.documents[0].result, function(err, collection) {
        if(options.include_statistics) {
          var stats = {
            processtime: result.documents[0].timeMillis,
            counts: result.documents[0].counts
          };
          callback(err, collection, stats);
        } else {
          callback(err, collection);
        }
      });
    } else {
      err != null ? callback(err, null, null) : callback(result.documents[0], null, null);
    }
  });
};

Collection.prototype.group = function(keys, condition, initial, reduce, command, callback) {
  var args = Array.prototype.slice.call(arguments, 3);
  callback = args.pop();
  reduce = args.length ? args.shift() : null;
  command = args.length ? args.shift() : null;

  if(command) {
    var hash = {},
        reduceFunction = reduce != null && reduce instanceof this.db.bson_serializer.Code ? reduce : new this.db.bson_serializer.Code(reduce);
    
    var selector = {
      group: 
      {
        'ns': this.collectionName,
        '$reduce': reduceFunction,
        'cond': condition,
        'initial': initial
      }
    };
    
    if(keys.constructor == Function)
    {
      var keyFunction = keys != null && keys instanceof this.db.bson_serializer.Code ? keys : new this.db.bson_serializer.Code(keys);
      selector.group.$keyf = keyFunction;
    }
    else
    {
      keys.forEach(function(key) {
        hash[key] = 1;
      });
      selector.group.key = hash;
    }
    
    this.db.executeCommand(DbCommand.createDbCommand(this.db, selector), function(err, result) {
      var document = result.documents[0];
      if(err == null && document.retval != null) {
        callback(null, document.retval);
      } else {
        err != null ? callback(err, null) : callback(new Error("group command failed: " + document.errmsg), null);
      }
    });
  } else {
    // Create execution scope
    var scope = reduce != null && reduce instanceof this.db.bson_serializer.Code ? reduce.scope : {};
    // Create scope for execution
    scope['ns'] = this.collectionName;
    scope['keys'] = keys;
    scope['condition'] = condition;
    scope['initial'] = initial;
    // Define group function
    var groupFunction = function() {
        var c = db[ns].find(condition);
        var map = new Map();
        var reduce_function = reduce;
        while (c.hasNext()) {
            var obj = c.next();

            var key = {};
            for (var i = 0; i < keys.length; i++) {
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
        return {"result": map.values()};
      };

    // Turn function into text and replace the "result" function of the grouping function
    var groupFunctionString = groupFunction.toString().replace(/ reduce;/, reduce.toString() + ';');
    // Execute group
    this.db.eval(new this.db.bson_serializer.Code(groupFunctionString, scope), function(err, results) {
      if(err != null) {
        callback(err, null);
      } else {
        if(results.constructor == Object) {
          callback(err, results.result);
        } else {
          callback(err, results);
        }
      }
    });
  }
};

Collection.prototype.options = function(callback) {
  this.db.collectionsInfo(this.collectionName, function(err, cursor) {
    // Fetch the object from the cursor
    cursor.nextObject(function(err, document) {
      callback(null, (document != null ? document.options : document));
    });
  });
};
