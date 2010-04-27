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
      
      
      Sugar still doesn't hide the clumbsy nature of the cursor api.
      
      right now
      
      Model.find({}).each(function(err,doc){
          if(doc !== null){
            
          }
      });
      
      Bad
      ---
      - handling for the err and the need to check it.
      - the checking to see if the cursor is null.
      
      proposed
      ---------
      
      Model.find({}).each(function(doc){
        // process
      });
      
      - Errors are silently ignored without halting the process.
      - null last cursor is eliminates
      - Error handling is now
      
          Model.addLister('error',callback);
      
      
      var db = new mongo.Db('test', new mongo.Server(host, port, {}), {});
      db.open(function(err,db){
        db.collection('test',function(err,collection){
            collection.find(function(err,cursor){
              cursor.each(function(err,doc){
                if(err) // error
                else if(doc != null){
                   // process here
                }
              })
            });
        });         
      });
      
      User = require('mongoose').Storage
            .connect({host: 'localhost', port : 34324, db : 'test'})
            .bindModel(__dirname+'/models/User');
            
      User.find().each(function(doc){
          // process here
      });
      
      
      
      
      
      // or
      
      User.find(function(){
        
      })



    
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
