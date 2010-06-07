require.paths.push(__dirname + '/lib/support/node-mongodb-native/lib');
require('lib/support/js-oo/lib/oo.js');

var sys = require('sys'),
    url = require('url'),
    Connection = require('lib/connection').Connection,
    EventEmitter = require('events').EventEmitter;

Mongoose = this.Mongoose = {
  
  _models: {},
  
  connect: function(uri, options){
    var _uri = url.parse(uri);
    _uri.port = _uri.port || 27017;
    return this._lookup(_uri) || this._open(_uri, options);
  },
  
  model: function(name, definition){
    if (definition){
      this._models[name] = definition;
    } else {
      return this._models[name];
    }
  },
  
  _open: function(uri, options){
    var connection = new Connection(this, uri, options);
    this._connections[url.format(uri)] = connection;
    return connection;
  },
  
  _lookup: function(uri){
    var _uri = url.format(uri);
    if (_uri in this._connections) return this._connections[_uri];
    return false;
  }
  
};

sys.inherits(Mongoose, EventEmitter.prototype);
EventEmitter.call(Mongoose);