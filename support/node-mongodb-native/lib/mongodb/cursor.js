var QueryCommand = require('./commands/query_command').QueryCommand,
  GetMoreCommand = require('./commands/get_more_command').GetMoreCommand,
  KillCursorCommand = require('./commands/kill_cursor_command').KillCursorCommand,
  OrderedHash = require('./bson/collections').OrderedHash,
  Integer = require('./goog/math/integer').Integer,
  Long = require('./goog/math/long').Long;

/**
  Handles all the operations on query result using find
**/
var Cursor = exports.Cursor = function(db, collection, selector, fields, skip, limit, sort, hint, explain, snapshot, timeout) {
  this.db = db;
  this.collection = collection;
  this.selector = selector;
  this.fields = fields;
  this.skipValue = skip == null ? 0 : skip;
  this.limitValue = limit == null ? 0 : limit;
  this.sortValue = sort;
  this.hint = hint;
  this.explainValue = explain;
  this.snapshot = snapshot;
  this.timeout = timeout;
  this.numberOfReturned = 0;
  this.totalNumberOfRecords = 0;
  this.items = [];
  this.cursorId = Long.fromInt(0);
  // Keeps track of location of the cursor
  this.index = 0;
  // State variables for the cursor
  this.state = Cursor.INIT;
  // Kepp track of the current query run
  this.queryRun = false;
};

  // Return an array of documents
Cursor.prototype.toArray = function(callback) {
  var self = this;

  try {
    if(self.state != Cursor.CLOSED) {
      self.fetchAllRecords(function(err, items) {
        self.state = Cursor.CLOSED;
        // Save object in internal cache that can be used for iterating and set index
        // to first object
        self.index = 0;
        self.items = items;
        callback(null, items);
      });
    } else {
      callback(new Error("Cursor is closed"), null);
    }
  } catch(err) {
    callback(new Error(err.toString()), null);
  }
};

// For Each materialized the objects at need
Cursor.prototype.each = function(callback) {
  var self = this;

  if(this.state != Cursor.CLOSED || (this.index <= this.items.length)) {
    // Fetch the next object until there is no more objects
    self.nextObject(function(err, item) {
      if(item != null) {
        callback(null, item);
        self.each(callback);
      } else {
        self.state = Cursor.CLOSED;
        callback(null, null);
      }
    });
  } else {
    callback(new Error("Cursor is closed"), null);
  }
};

Cursor.prototype.count = function(callback) {
  this.collection.count(this.selector, callback);
};

Cursor.prototype.sort = function(keyOrList, direction, callback) {
  if(typeof direction === "function") { callback = direction; direction = null; }
  if(this.queryRun == true || this.state == Cursor.CLOSED) {
    callback(new Error("Cursor is closed"), null);
  } else {
    var order = keyOrList;

    if(direction != null) {
      order = [[keyOrList, direction]];
    }
    this.sortValue = order;
    callback(null, this);
  }
};

Cursor.prototype.limit = function(limit, callback) {
  if(this.queryRun == true || this.state == Cursor.CLOSED) {
    callback(new Error("Cursor is closed"), null);
  } else {
    if(limit != null && limit.constructor != Number) {
      callback(new Error("limit requires an integer"), null);
    } else {
      this.limitValue = limit;
      callback(null, this);
    }
  }
};

Cursor.prototype.skip = function(skip, callback) {
  if(this.queryRun == true || this.state == Cursor.CLOSED) {
    callback(new Error("Cursor is closed"), null);
  } else {
    if(skip != null && skip.constructor != Number) {
      callback(new Error("skip requires an integer"), null);
    } else {
      this.skipValue = skip;
      callback(null, this);
    }
  }
};

Cursor.prototype.generateQueryCommand = function() {
  // Unpack the options
  var timeout  = this.timeout != null ? this.timeout : QueryCommand.OPTS_NONE;
  var queryOptions = timeout;  
  // Check if we need a special selector
  if(this.sortValue != null || this.explainValue != null || this.hint != null || this.snapshot != null) {
    // Build special selector
    var specialSelector = {'query':this.selector};
    if(this.sortValue != null) specialSelector['orderby'] = this.formattedOrderClause();
    if(this.hint != null && this.hint.constructor == Object) specialSelector['$hint'] = this.hint;
    if(this.explainValue != null) specialSelector['$explain'] = true;
    if(this.snapshot != null) specialSelector['$snapshot'] = true;

    return new QueryCommand(this.db.databaseName + "." + this.collection.collectionName, queryOptions, this.skipValue, this.limitValue, specialSelector, this.fields);
  } else {
    return new QueryCommand(this.db.databaseName + "." + this.collection.collectionName, queryOptions, this.skipValue, this.limitValue, this.selector, this.fields);
  }
};

Cursor.prototype.formattedOrderClause = function() {
  var orderBy = {};
  var self = this;

  if(this.sortValue instanceof Array) {
    this.sortValue.forEach(function(sortElement) {
      if(sortElement.constructor == String) {
        orderBy[sortElement] = 1;
      } else {
        orderBy[sortElement[0]] = self.formatSortValue(sortElement[1]);
      }
    });
  } else if(this.sortValue instanceof OrderedHash) {
    throw new Error("Invalid sort argument was supplied");
  } else if(this.sortValue.constructor == String) {
    orderBy[this.sortValue] = 1
  } else {
    throw Error("Illegal sort clause, must be of the form " +
      "[['field1', '(ascending|descending)'], ['field2', '(ascending|descending)']]");
  }
  return orderBy;
};

Cursor.prototype.formatSortValue = function(sortDirection) {
  var value = ("" + sortDirection).toLowerCase();
  if(value == 'ascending' || value == 'asc' || value == 1) return 1;
  if(value == 'descending' || value == 'desc' || value == -1 ) return -1;
  throw Error("Illegal sort clause, must be of the form " +
    "[['field1', '(ascending|descending)'], ['field2', '(ascending|descending)']]");
};

Cursor.prototype.fetchAllRecords = function(callback) {
  var self = this;

  if(self.state == Cursor.INIT) {
    var queryCommand = self.generateQueryCommand();
    self.db.executeCommand(queryCommand, function(err, result) {
      var numberReturned = result.numberReturned;
      // Check if we need to fetch the count
      if(self.limitValue > 0 && self.limitValue > numberReturned) {
        self.totalNumberOfRecords = numberReturned;
        self.fetchFirstResults(result, callback);
      } else if(self.limitValue > 0 && self.limitValue <= numberReturned) {
        self.totalNumberOfRecords = self.limitValue;
        self.fetchFirstResults(result, callback);
      } else {
        self.totalNumberOfRecords = numberReturned;
        self.fetchFirstResults(result, callback);
      }
    });
  } else if(self.state == Cursor.OPEN) {
    if(self.cursorId.greaterThan(Long.fromInt(0))) {
      // Build get more command
      var getMoreCommand = new GetMoreCommand(self.db.databaseName + "." + self.collection.collectionName, self.limitValue, self.cursorId);
      // Execute the command
      self.db.executeCommand(getMoreCommand, function(err, result) {
        self.numberOfReturned = result.numberReturned;
        self.cursorId = result.cursorId;
        self.totalNumberOfRecords = self.totalNumberOfRecords + self.numberOfReturned;
        // Determine if there's more documents to fetch
        if(self.numberOfReturned > 0 && (self.limitValue == 0 || self.totalNumberOfRecords < self.limitValue)) {
          result.documents.forEach(function(item) { self.items.push(item);});
          self.fetchAllRecords(callback);
        } else {
          // Close the cursor if we still have one
          if(self.cursorId.greaterThan(Long.fromInt(0))) self.close(function(cursor) {});
          // Return all the items fetched
          callback(null, self.items);
        }
      });
    } else {
      // Close the cursor as all results have been read
      callback(null, self.items);
      self.state = Cursor.CLOSED;
    }
  }
};

Cursor.prototype.fetchFirstResults = function(result, callback) {
  var self = this;
  this.cursorId = result.cursorId;
  this.queryRun = true;
  this.numberOfReturned = result.numberReturned;
  this.totalNumberOfRecords = this.numberOfReturned;

  // Add the new documents to the list of items
  result.documents.forEach(function(item) { self.items.push(item);});
  // Adjust the state of the cursor
  this.state = Cursor.OPEN;
  // Fetch more records
  this.fetchAllRecords(callback);
};

Cursor.prototype.nextObject = function(callback) {
  var self = this;

  // Fetch the first batch of records if none are available
  if(self.state == Cursor.INIT) {
    // Fetch the total count of object
    try {
      // Execute the first query
      this.fetchAllRecords(function(err, items) {
        self.items = items;

        if(self.index < items.length) {
          callback(null, items[self.index++]);
        } else {
          callback(null, null);
        }
      });
    } catch(err) {
      callback(new Error(err.toString()), null);
    }
  } else {
    if(self.items.length > self.index) {
      callback(null, self.items[self.index++]);
    } else {
      callback(null, null);
    }
  }
};

Cursor.prototype.explain = function(callback) {
  var limit = (-1)*Math.abs(this.limitValue);
  // Create a new cursor and fetch the plan
  var cursor = new Cursor(this.db, this.collection, this.selector, this.fields, this.skipValue, limit,
      this.sortValue, this.hint, true, this.snapshot, this.timeout);
  cursor.nextObject(function(err, item) {
    // close the cursor
    cursor.close(function(err, result) {
      callback(null, item);
    });
  });
};

Cursor.prototype.streamRecords = function(callback) {
  var
    self = this,
    stream = new process.EventEmitter(),
    recordLimitValue = this.limitValue || 0,
    emittedRecordCount = 0,
    queryCommand = this.generateQueryCommand();

  // see http://www.mongodb.org/display/DOCS/Mongo+Wire+Protocol
  queryCommand.numberToReturn = 500; 

  execute(queryCommand);

  function execute(command) {
    self.db.executeCommand(command, function(err,result) {
      if (!self.queryRun && result) {
        self.queryRun = true;
        self.cursorId = result.cursorId;
        self.state = Cursor.OPEN;
        self.getMoreCommand = new GetMoreCommand(self.db.databaseName + "." + self.collection.collectionName, queryCommand.numberToReturn, result.cursorId);
      }
      if (result.documents && result.documents.length) {
        result.documents.forEach(function(doc){ 
          if (recordLimitValue && emittedRecordCount>recordLimitValue) {
            stream.emit('end', recordLimitValue);
            self.close(function(){});
            return(null);
          }
          emittedRecordCount++;
          stream.emit('data', doc); 
        });
        // rinse & repeat
        execute(self.getMoreCommand);
      } else {
        self.close(function(){
          stream.emit('end', recordLimitValue);          
        });
      }
    });
  }
  return stream;
};

Cursor.prototype.close = function(callback) {
  var self = this;

  // Close the cursor if not needed
  if(self.cursorId instanceof Long && self.cursorId.greaterThan(new Long.fromInt(0))) {
    var command = new KillCursorCommand([self.cursorId]);
    self.db.executeCommand(command, function(err, result) {});
  }

  self.cursorId = Long.fromInt(0);
  self.state = Cursor.CLOSED;
  callback(null, self);
};

Cursor.prototype.isClosed = function() {
  return this.state == Cursor.CLOSED ? true : false;
};

// Static variables
Cursor.INIT = 0;
Cursor.OPEN = 1;
Cursor.CLOSED = 2;
