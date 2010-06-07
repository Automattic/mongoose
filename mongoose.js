require.paths.unshift(__dirname + '/lib/support/node-mongodb-native/lib', __dirname + '/lib/support/js-oo/lib');
require('oo');

var sys = require('sys'),
    url = require('url'),
    EventEmitter = require('events').EventEmitter,
    Connection = require('./lib/connection').Connection,

Mongoose = this.Mongoose = {
  
  _models: {},
  
  _connections: {},
  
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