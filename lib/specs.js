var conn = require('./connection'),

MockCollection = this.MockCollection = Class({
  
  find: function(query, options, callback){
    if (callback) callback({}, []); // will yield no results
  },
  
  insert: function(doc, callback){
    if (callback) callback({}, [])
  },
  
  remove: function(doc, callback){
    if (callback) callback({}, [])
  },
  
  save: function(doc, callback){
    if (callback) callback({}, []);
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