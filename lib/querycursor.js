var helpers = require('./queryhelpers');
var Readable = require('stream').Readable;
var util = require('util');

function QueryCursor(query, options) {
  Readable.call(this, { objectMode: true });

  this.cursor = null;
  this.query = query;
  var _this = this;
  var model = query.model;
  model.collection.find(query._conditions, options, function(err, cursor) {
    if (err) {
      return _this.emit('error', err);
    }
    _this.cursor = cursor;
    _this.emit('cursor', cursor);
  });
}

util.inherits(QueryCursor, Readable);

QueryCursor.prototype._read = function() {
  var _this = this;
  this.next(function(error, doc) {
    if (error) {
      return _this.emit('error', error);
    }
    if (!doc) {
      _this.push(null);
      return _this.cursor.close(function(error) {
        if (error) {
          return _this.emit('error', error);
        }
        _this.emit('close');
      });
    }
    _this.push(doc);
  });
};

QueryCursor.prototype.next = function(cb) {
  var _this = this;
  if (this.cursor) {
    this.cursor.next(function(error, doc) {
      if (error) {
        return cb(error);
      }
      if (!doc) {
        return cb(null, null);
      }

      var opts = _this.query._mongooseOptions;
      if (!opts.populate) {
        return _create(_this, doc, null, cb);
      }

      var pop = helpers.preparePopulationOptionsMQ(_this.query,
        _this.query._mongooseOptions);
      pop.forEach(function(option) {
        delete option.model;
      });
      pop.__noPromise = true;
      _this.query.model.populate(doc, pop, function(err, doc) {
        if (err) {
          return cb(err);
        }
        _create(_this, doc, pop, cb);
      });
    });
  } else {
    this.once('cursor', function() {
      _this.next(cb);
    });
  }
};

function _create(ctx, doc, populatedIds, cb) {
  var instance = helpers.createModel(ctx.query.model, doc, ctx.query._fields);
  var opts = populatedIds ?
    {populated: populatedIds} :
    undefined;

  instance.init(doc, opts, function(err) {
    if (err) {
      return cb(err);
    }
    cb(null, instance);
  });
}

module.exports = QueryCursor;
