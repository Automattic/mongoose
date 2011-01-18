var InsertCommand = require('./commands/insert_command').InsertCommand,
  QueryCommand = require('./commands/query_command').QueryCommand,
  DeleteCommand = require('./commands/delete_command').DeleteCommand,
  UpdateCommand = require('./commands/update_command').UpdateCommand,
  DbCommand = require('./commands/db_command').DbCommand,
  BinaryParser = require('./bson/binary_parser').BinaryParser,
  OrderedHash = require('./bson/collections').OrderedHash,
  BSON = require('./bson/bson'),
  ObjectID = BSON.ObjectID,
  Code = BSON.Code,
  Cursor = require('./cursor').Cursor;


/**
  Sort functions, Normalize and prepare sort parameters
**/
var formatSortValue = function(sortDirection) {
  var value = ("" + sortDirection).toLowerCase();
  if(value == 'ascending' || value == 'asc' || value == 1) return 1;
  if(value == 'descending' || value == 'desc' || value == -1 ) return -1;
  throw Error("Illegal sort clause, must be of the form " +
    "[['field1', '(ascending|descending)'], ['field2', '(ascending|descending)']]");
};

var formattedOrderClause = function(sortValue) {
  var orderBy = {};
  var self = this;

  if(sortValue instanceof Array) {
    sortValue.forEach(function(sortElement) {
      if(sortElement.constructor == String) {
        orderBy[sortElement] = 1;
      } else {
        orderBy[sortElement[0]] = formatSortValue(sortElement[1]);
      }
    });
  } else if(sortValue instanceof OrderedHash) {
    throw new Error("Invalid sort argument was supplied");
  } else if(sortValue.constructor == String) {
    orderBy[sortValue] = 1
  } else {
    throw Error("Illegal sort clause, must be of the form " +
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
  this.pkFactory = pkFactory == null ? ObjectID : pkFactory;
  // Add getter and setters
  this.__defineGetter__("hint", function() { return this.internalHint; });
  this.__defineSetter__("hint", function(value) { this.internalHint = this.normalizeHintField(value); });
  // Ensure the collection name is not illegal
  this.checkCollectionName(collectionName);
};

Collection.prototype.insert = function(docs, callback) {
  this.insertAll(Array.isArray(docs) ? docs : [docs], callback);
  return this;
};

Collection.prototype.checkCollectionName = function(collectionName) {
  if (typeof collectionName != 'string')
    throw Error("collection name must be a String");

  if (!collectionName || collectionName.indexOf('..') != -1)
    throw Error("collection names cannot be empty");

  if (collectionName.indexOf('$') != -1 && collectionName.match(/((^\$cmd)|(oplog\.\$main))/) == null)
    throw Error("collection names must not contain '$'");

  if (collectionName.match(/^\.|\.$/) != null)
    throw Error("collection names must not start or end with '.'");
};

Collection.prototype.remove = function(selector, callback) {
  if(callback == null) { callback = selector; selector = null; }

  // Generate selector for remove all if not available
  var removeSelector = selector == null ? {} : selector;
  var deleteCommand = new DeleteCommand(this.db.databaseName + "." + this.collectionName, removeSelector);
  // Execute the command
  this.db.executeCommand(deleteCommand, callback);
  // Callback with no commands
  if(callback != null) callback(null, this);
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

Collection.prototype.insertAll = function(docs, callback) {
  var error= null;
  
  try {
    // List of all id's inserted
    var objects = [];
    // Create an insert command
    var insertCommand = new InsertCommand(this.db.databaseName + "." + this.collectionName);
    // Add id to each document if it's not already defined
    for(var index = 0; index < docs.length; index++) {
      var doc = docs[index];

      if(!(doc instanceof OrderedHash)) {
        doc._id = doc._id == null ? this.pkFactory.createPk() : doc._id;
      } else {
        // Add the id to the document
        var id = doc.get("_id") == null ? this.pkFactory.createPk() : doc.get("_id");
        doc.add('_id', id);
      }

      // Insert the document
      insertCommand.add(doc);
      objects.push(doc);
    }
    // Execute the command
    this.db.executeCommand(insertCommand);
  } catch(err) {
    error= err;
  }
  // Return the id's inserted calling the callback (mongo does not callback on inserts)
  if(callback )  {
    if( error ) callback(error, null);
    else callback(null, objects);
  }
};

Collection.prototype.save = function(doc, options, callback) {
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  options = args.length ? args.shift() : null;

  var id = (doc instanceof OrderedHash) ? doc.get('_id') : doc['_id'];

  if(id != null) {
    this.update({'_id':id}, doc, {upsert: true, safe: options != null ? options.safe : false}, callback);
  } else {
    this.insert(doc, function(err, docs) { Array.isArray(docs) ? callback(err, docs[0]) : callback(err, docs); });
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
    safe - true/false (perform check if the operation failed, required extra call to db)
**/
Collection.prototype.update = function(spec, document, options, callback) {
  if(callback == null) { callback = options; options = null; }
  try {
    var safe = options == null || options.safe == null || options.safe == false ? false : true;
    // Create update command
    var updateCommand = new UpdateCommand(this.db.databaseName + "." + this.collectionName, spec, document, options);
    // Execute command
    this.db.executeCommand(updateCommand);
    // If safe, we need to check for successful execution
    if(safe) {
      this.db.error(function(err, doc) {
        if(doc[0].updatedExisting == false) {
          if(callback != null) callback(new Error("Failed to update document"), null);
        } else {
          if(callback != null) callback(null, document);
        }
      });
    } else {
      // Call back with ok if no error found
      if(callback != null) callback(null, document);
    }
  } catch(err) {
    if(callback != null) callback(err, null);
  }
};

/**
  Fetch a distinct collection
**/
Collection.prototype.distinct = function(key, query, callback) {
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  query = args.length ? args.shift() : {};

  var mapCommandHash = new OrderedHash();
  mapCommandHash.add('distinct', this.collectionName).add('key', key).add('query', query);

  this.db.executeCommand(DbCommand.createDbCommand(this.db.databaseName, mapCommandHash), function(err, result) {
    if(err == null && result.documents[0].ok == 1) {
      callback(null, result.documents[0].values);
    } else {
      err != null ? callback(err, null) : callback(new Error(result.documents[0].errmsg), null);
    }
  });
};

Collection.prototype.count = function(query, callback) {
  if(typeof query === "function") { callback = query; query = null; }
  var query_object = query == null ? new OrderedHash() : query;
  var final_query = {count: this.collectionName, query: query_object, fields: null};
  var queryCommand = new QueryCommand(this.db.databaseName + ".$cmd", QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, final_query, null);
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
  remove_doc:   set to a true to remove the object before returning 
  new_doc:      set to true if you want to return the modified object rather than the original. Ignored for remove.
**/
Collection.prototype.findAndModify = function(query, sort, update, new_doc, remove_doc, callback) {
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  sort = args.length ? args.shift() : [];  
  update = args.length ? args.shift() : null;  
  new_doc = args.length ? args.shift() : false;  
  remove_doc = args.length ? args.shift() : null;
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
  // Set the new option
  queryObject['new'] = new_doc ? 1 : 0;
  // Set up the update if it exists
  if(update) queryObject['update'] = update;
  // Set up the sort
  if(!Array.isArray(sort) && sort.length == 0) queryObject['sort'] = sort_object;
  // If we have defined new then pass that in
  if(remove_doc) queryObject['remove'] = remove_doc ? 1 : 0;
  if(remove_doc) delete queryObject['update'];
  // Execute command
  this.db.executeDbCommand(queryObject, function(err, doc) {
    err ? callback(err, doc) : callback(err, doc.documents[0].value);
  });
}

/*
various argument possibilities
  1 callback
  2 selector, callback,
  2 callback, options  // really?!
  3 selector, fields, callback
  3 selector, options, callback
  4,selector, fields, options, callback
  5 selector, fields, skip, limit, callback
  6 selector, fields, skip, limit, timeout, callback       
*/
Collection.prototype.find = function() {
  var options,
      len = arguments.length,
      selector = (len > 1) ? arguments[0] : new OrderedHash(),
      fields = (len > 2) ? arguments[1] : undefined,
      callback = arguments[len-1];
  
  if(len == 2 && typeof arguments[0] == 'function'){
    selector = new OrderedHash(); options = arguments[1]; callback = arguments[0];
  }
  
  if(len == 3){ // backwards compat for options object
    var test = ['limit','sort','fields','skip','hint','explain','snapshot','timeout'],
        idx = 0, l = test.length, is_option = false;    
    while(!is_option && idx < l) if(test[idx] in fields ) is_option = true; else idx++;
    options = is_option ? fields : {};
    if(is_option) fields = undefined;
  }
  if(len == 4) options = arguments[2];
  
  if(options && options.fields){
    fields = {};
    if(options.fields.constructor == Array){
      if(options.fields.length == 0) fields['_id'] = 1;
      else for(i = 0, l = options.fields.length; i < l; i++) fields[options.fields[i]] = 1;
    }
    else fields = options.fields;
  }
  if(!options) options = {};
  
  options.skip = len > 4 ? arguments[2] : options.skip ? options.skip : 0;
  options.limit = len > 4 ? arguments[3] : options.limit ? options.limit : 0;
  options.hint = options.hint != null ? this.normalizeHintField(options.hint) : this.internalHint;
  options.timeout = len == 6 ? arguments[4] : options.timeout ? options.timeout : undefined;
    
  var o = options;
  callback(null, new Cursor(this.db, this, selector, fields, o.skip, o.limit, o.sort, o.hint, o.explain, o.snapshot, o.timeout)); 
};

Collection.prototype.normalizeHintField = function(hint) {
  var finalHint = null;
  // Normalize the hint parameter
  if(hint != null && hint.constructor == String) {
    finalHint = new OrderedHash().add(hint, 1);
  } else if(hint != null && hint.constructor == Object) {
    finalHint = new OrderedHash();
    for(var name in hint) { finalHint.add(name, hint[name]); }
  } else if(hint != null && hint.constructor == Array) {
    finalHint = new OrderedHash();
    hint.forEach(function(param) { finalHint.add(param, 1); });
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
      else for(i = 0, l = options.fields.length; i < l; i++) fields[options.fields[i]] = 1;
    }
    else fields = options.fields;
  }    
  // Unpack the options
  var timeout  = options.timeout != null ? options.timeout : QueryCommand.OPTS_NONE;
  var queryOptions = timeout;
  // Build final query
  var finalQueryObject = queryObject == null ? {} : queryObject;
  // Validate the type of query
  finalQueryObject = finalQueryObject instanceof ObjectID ? {'_id':finalQueryObject} : finalQueryObject;
  // Build special selector
  var specialSelector = {'query':finalQueryObject};
  // Execute the command
  var queryCommand = new QueryCommand(this.db.databaseName + "." + this.collectionName, queryOptions, 0, 1, specialSelector, fields);
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
  options = args.length ? args.shift() : {};

  var self = this;

  if(typeof map === "function") { map = map.toString(); }
  if(typeof reduce == "function") { reduce = reduce.toString(); }

  // Build command object for execution
  var mapCommandHash = new OrderedHash();
  mapCommandHash.add('mapreduce', this.collectionName)
    .add('map', map)
    .add('reduce', reduce);
  // Add any other options passed in
  for(var name in options) {
    mapCommandHash.add(name, options[name]);
  }
  // Execute command against server
  this.db.executeCommand(DbCommand.createDbCommand(this.db.databaseName, mapCommandHash), function(err, result) {
    if(err == null && result.documents[0].ok == 1) {
      // Create a collection object that wraps the result collection
      self.db.collection(result.documents[0].result, function(err, collection) {
        callback(err, collection);
      });
    } else {
      err != null ? callback(err, null) : callback(new Error("map-reduce failed: " + result.documents[0].errmsg), null);
    }
  });
};

Collection.prototype.group = function(keys, condition, initial, reduce, command, callback) {
  var args = Array.prototype.slice.call(arguments, 3);
  callback = args.pop();
  reduce = args.length ? args.shift() : null;
  command = args.length ? args.shift() : null;

  if(command) {
    var hash = new OrderedHash();
    keys.forEach(function(key) {
      hash.add(key, 1);
    });

    var reduceFunction = reduce != null && reduce instanceof Code ? reduce : new Code(reduce);
    var selector = {'group': {
                      'ns':this.collectionName,
                      '$reduce': reduce,
                      'key':hash,
                      'cond':condition,
                      'initial': initial}};

    this.db.executeCommand(DbCommand.createDbCommand(this.db.databaseName, selector), function(err, result) {
      var document = result.documents[0];
      if(err == null && document.retval != null) {
        callback(null, document.retval);
      } else {
        err != null ? callback(err, null) : callback(new Error("group command failed: " + document.errmsg), null);
      }
    });
  } else {
    // Create execution scope
    var scope = reduce != null && reduce instanceof Code ? reduce.scope : new OrderedHash();
    // Create scope for execution
    scope.add('ns', this.collectionName)
      .add('keys', keys)
      .add('condition', condition)
      .add('initial', initial);

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
    this.db.eval(new Code(groupFunctionString, scope), function(err, results) {
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
