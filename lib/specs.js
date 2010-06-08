var conn = require('./connection'),
    Class = require('./util').Class,

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

MockConnection = this.MockConnection = conn.Connection.extend({
  
  _open: function(){
    this.db = new MockDB();
  }
  
});