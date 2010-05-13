Mongoose: MongoDB utility library with ODM-like functionality
===============================================================

The goal of Mongoose is to provide a extremely simple interface for MongoDB. 

Goals
-----
- Reduce the burden of dealing with nested callback from async operations.
- Provide a simple yet rich API.
- Still have easy access to the database/collection.
- Ability to model your data with custom interfaces.

Quick Start
------------

The current state of of mongo with async javascript.

    var db = new mongo.Db('test', new mongo.Server('localhost', 34324, {}), {});
    db.open(function(err, db) {
      db.collection('test', function(err, collection) {
    	  db.find({},function(err,cursor){
    		  cursor.forEach(function(err,doc){
    			  if(doc != null){
    				  // do something.
    			  }
    		  });
    	  });
      });
    });
    
With Mongoose:

    var mongoose = require('mongoose/').Mongoose,
        db = mongoose.connect('mongodb://localhost/test'),      
        Collection = mongoose.noSchema('test',db); // collection name
        
    Collection.find({}).each(function(doc){
      // do something
    });
        
Mongoose buffers the connection to the database providing an easier to use API. Mongoose also adds some neat chaining features to allow for a more expressive and easier way of dealing with your data.

Query Promises
-------------

Mongoose implements the promise pattern for queries. This assures the developer that execution happens in proper order.

  var promise = Collection.find();
      promise.gt({'age' : 20}).lt({'bio.age' : 25}).limit(10); // promise commands are chainable.
      
Currently the Mongoose QueryPromise API is lazy. A query action is not performed until an 'action' method has been assigned.

- Actions (each,count,first,one,get,execute,exec,run)

In the case of 'each','first','one','get' they take two arguments. A callback, and an option to hydrate. It is important to note that all callbacks operate within the scope of the QueryPromise. 

QueryPromises provide the following helper methods in addition to the query 'sugar' methods.

- result - sets a result value for the promise
- partial - sets a partial result for a promise, handy for result sets using .each()
- error - define an error
- then - code you want to execute after the promise has been made. It takes 2 parameters. The first is your callback, second is an optional in case of errors.

An example using each

    promise.each(function(doc){
        // do something
        this.partial(doc.title);
    }).then(function(titles){
      // titles is an array of the doc titles
    });
    
QueryPromise query helper methods.

  'sort','limit','skip','hint','timeout','snapshot','explain',
  'where','in','nin','ne','gt','gte','lt','lte', 'min','max','mod','all','size','exists','type','not'
  'inc','set','unset','push','pushAll','addToSet','pop','pull','pullAll'


Models
-------

Configuration and Setup
-----------------------

Connections
...........


Example
-------


Requirements
------------
- Node Thanks Ryan.
- [MongoDB](http://www.mongodb.org/display/DOCS/Downloads)
- [node-mongodb-native](http://github.com/christkv/node-mongodb-native) Thanks Christian.

Credits
--------
- Node, MongoDB, and node-mongodb-native without these none of this would have been possible.
- Some ideas and inspiration from Ming

Future
------
- More robust Model type declaration
- Ability to define foreign keys
- Add Inheritance to Models.

Revisions
---------
