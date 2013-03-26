var Promise = require('./promise')
  , util = require('util');
  
function Aggregate () {
  this._pipeline = [];
  this._model = undefined;
}

Aggregate.prototype.cast = function (model) {
  this._model = model;
  return this;
};

Aggregate.prototype.append = function () {
  var args = [].slice.call(arguments)
    , arg;
    
  if (!args.every(function (arg) { return 'object' === typeof arg && !util.isArray(arg); })) {
    throw new Error("Arguments must be aggregate pipeline operators");
  }
  
  this._pipeline = this._pipeline.concat(args);
  
  return this;
};

Aggregate.prototype.select = function (arg) {
  var fields = {};
  
  if ('object' === typeof arg && !util.isArray(arg)) {
    Object.keys(arg).forEach(function (field) {
      fields[field] = arg[field];
    });
  } else if (1 === arguments.length && 'string' === typeof arg) {
    arg.split(/\s+/).forEach(function (field) {
      if (!field) return;
      var include = '-' == field[0] ? 0 : 1;
      if (include === 0) field = field.substring(1);
      fields[field] = include;
    });
  } else {
    throw new Error("Invalid select() argument. Must be string or object");
  }
  
  return this.project(fields);
};

Aggregate.prototype.project = function (arg) {
  return this.append({ $project: arg });
};

Aggregate.prototype.group = function (arg) {
  return this.append({ $group: arg });
};

Aggregate.prototype.skip = function (count) {
  return this.append({ $skip: count });
};

Aggregate.prototype.limit = function (count) {
  return this.append({ $limit: count });
};

Aggregate.prototype.exec = function (callback) {
  var promise = new Promise();
  
  if (callback) {
     promise.addBack(callback);
  }
  
  if (!this._pipeline.length) {
    promise.error(new Error("Aggregate has empty pipeline"));
    return this;
  }
  
  if (!this._model) {
    promise.error(new Error("Aggregate not bound to any Model"));
    return this;
  }
  
  this._model.collection.aggregate(this._pipeline, function (err, docs) {
    if (err) {
      return promise.error(err);
    }
    
    promise.complete(docs);
  });
  
  return promise;
};

module.exports = Aggregate;