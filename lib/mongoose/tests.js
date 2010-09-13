var mongoose = require('mongoose').Mongoose,
    Connection = require('./connection').Connection,
    Class = require('./util').Class;

// for integration

mongoose.test = function(){
  return this.connect('mongodb://localhost/test_' + String(Math.random()).substr(2));
};

Connection.prototype.terminate = function(){
  var self = this;
  this.db.dropDatabase(function(){ self.close(); });
  return this;
};

// for specs

MockCollection = this.MockCollection = Class({
  
  find: function(query, options, callback){
    if (callback) callback(null, this._mockData || []); // will yield no results
  },
  
  insert: function(doc, callback){
    if (callback) callback(null, this._mockData || [])
  },
  
  remove: function(doc, callback){
    if (callback) callback(null, this._mockData || [])
  },
  
  save: function(doc, callback){
    if (callback) callback(null, this._mockData || []);
  }
  
}),

MockDB = this.MockDB = Class({
  
  collection: function(name, callback){
    callback(null, new MockCollection());
  }
  
}),

MockConnection = this.MockConnection = Connection.extend({
  
  _open: function(){
    this.db = new MockDB();
    this._connected = true;
  }
  
});