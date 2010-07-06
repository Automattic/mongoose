var sys = require('sys'),
    url = require('url'),
    EventEmitter = require('events').EventEmitter,
    Connection = require('./connection').Connection,

Mongoose = this.Mongoose = {
  
  _config: {
    log: true
  },
  
  _models: {},
  
  _connections: {},
  
  connect: function(uri, options){
    var _uri = url.parse(uri);
    if (_uri.protocol !== 'mongodb:') throw new Error('Please include the mongodb:// protocol');
    if (!_uri.pathname) throw new Error('Please provide a database name');
    _uri.port = _uri.port || '27017';
    _uri.hostname = _uri.hostname.toLowerCase();
    _uri.host = _uri.host.toLowerCase();
    _uri.pathname = _uri.pathname.replace(/\//g, '').toLowerCase();
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
    var connection = new Connection(this, uri, options), self = this;
    this._connections[url.format(uri)] = connection;
    connection.addListener('error', function(err){
      self._onError(connection, err);
    });
    return connection;
  },
  
  _onError: function(connection, err){
    if (this.set('log')){
      sys.log('Mongoose Error, connection: ' + url.format(connection.uri));
      sys.puts(err.stack);
    }
  },
  
  _lookup: function(uri){
    var _uri = url.format(uri);
    if (_uri in this._connections) return this._connections[_uri];
    return false;
  },
  
  set: function(){
    if (arguments.length == 1){
      return this._config[arguments[0]];
    } else {
      this._config[arguments[0]] = arguments[1];
      return this;
    }
  },
  
  enable: function(key){
    this._config[key] = true;
    return this;
  },
  
  disable: function(key){
    this._config[key] = false;
    return this;
  }
  
};

sys.inherits(Mongoose, EventEmitter);
EventEmitter.call(Mongoose);
