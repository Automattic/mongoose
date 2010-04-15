Mongoose: MongoDB utility library with ORM-like functionality
===============================================================

The goal of Mongoose is to provide a extremely simple interface for MongoDB. 

Goals
-----
- Reduce the burden of dealing with nested callback from async operations.
- Provide a simple yet rich set of APIs.
- Still have easy access to the database/collection.


Quick Start
------------

      User = require('mongoose').Storage
            .connect({host: 'localhost', port : 34324})
            .bindModel(__dirname+'/models/User');
            
      User.find(query).each(function(user){
          // do something to matching user
      });
      
      User
        .find
        .update
        .upsert
        .insert
        .count
        .distinct
        .mapReduce
        .remove
        .flush
        
      each : [find,update,upsert,insert,distinct,remove]
      get/one [find,count,mapReduce]  
        
      User.collection = native collection instance
      User.database = native database instance.
      
        
      
      User.update(query)
      
      User.insert(object);
      
      var user = new User(object);
      
      
      



    
    /*
      loadModels takes either an array of specifc model paths. 
      Or it can take a require path that ends in a backslash (/)
      it will load all .js files within the directory. 
      
      The return is an object whose keys are the basename and the 
      values is the Model instance 
      
      ex:
      
      var storage = Mogoose.connect({...}),
      m = Models = storage.loadModels('./models/');
    
      m.user.find({}).each()
    
      m.user.find().one(function(){})
      
    */


Example
-------

    mongoose = require('../../mongoose/').configure({
            dev : { master : { host : 'localhost',  port : 27017, name : 'test', options : {auto_reconnect : true}} }
        }),      
    devStore = mongoose.connect('dev'),
    models = require('../lib/model').Model,
    models.load('User',devStore,function(User){
      
    });

Requirements
------------

- Node v0.1.32+ (tested with v0.1.32, v0.1.33)
- [MongoDB](http://www.mongodb.org/display/DOCS/Downloads) (tested with 1.4.0)
- [node-mongodb-native](http://github.com/christkv/node-mongodb-native) 


Future
------
- implement a generic BSON module for Node.js using: [Mongo BSON C++ Libray](http://www.mongodb.org/pages/viewpage.action?pageId=133415)

Revisions
---------
