var Connection = require('./connection').Connection,

MockCollection = this.MockCollection = Class({
  
  find: function(query, options, callback){
    callback({}, []); // will yield no results
  },
  
  save: function(doc, callback){
    callback();
  }
  
}),

MockDB = this.MockDB = Class({
  
  collection: function(name, callback){
    callback(err, new MockCollection());
  }
  
}),

MockConnection = this.MockConnection = Connection.extend({
  
  _open: function(){
    this.db = new MockDB();
  }
  
});