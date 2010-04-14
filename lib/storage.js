var Class = require('./support/class/lib/class').Class,


types : {
  mongodb : ''
}

this.Storage = function(options){
  
  
}

this.getConnection(locator,options){
  
};



/* 
  DataStore makes sure to return same instances if the same data source is requested multiple times.
  
  var storage = require('storage'),
      db1 = storage.get('mongodb://user:pass@server/db')
      db2 = storage.get('mongodb://user:pass@server/db');
  
  db1 === db2; // true
  
*/

// Models are initialized with a DataStore object

var models = require('models'),
    User = models.get('User', db1);

// querying
User.get({},callback);


// creating 
var user =new User({ json : obj });