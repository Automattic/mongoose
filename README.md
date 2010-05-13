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
    promise.gt({age : 20}).lt({age : 25}).limit(10); // promise commands are chainable.
      
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

**sort**,**limit**,**skip**,**hint**,**timeout**,**snapshot**,**explain**,
**where**,**in**,**nin**,**ne**,**gt**,**gte**,**lt**,**lte**, **min**,**max**,**mod**,**all**,**size**,**exists**,**type**,**not**
**inc**,**set**,**unset**,**push**,**pushAll**,**addToSet**,**pop**,**pull**,**pullAll**


Models
-------
Mongoose allows you to define models for your data. Models provide an interface to your data. 

   Model.define('User',{
    
     collection : 'test_user', // (optional) if not present uses the model name instead.

     // defines your data structure
     types: {
       _id : Object, // if not defined, Mongoose automatically defines for you.
       username: String,
       first : String,
       last : String,
       bio: {
         age: Number
       }
     },

     indexes : [
       'username',
       'bio.age',
       [['first'],['last']] // compound key indexes
     ],
     
     static : {}, // adds methods onto the Model.
     methods : {}, // adds methods to Model instances.

     setters: { // custom setters
       first: function(v){
         return v.toUpperCase();
       }
     },
     
     getters: { // custom getters
       username: function(v){
         return v.toUpperCase();
       },

       legalDrinkingAge : function(){
         return (this.bio.age >= 21) ? true : false;
       },

       first_last : function(){ // custom getter that merges two getters together.
         return this.first + ' ' + this.last;
       }
     }

   });   
   
All sections of a Mongoose Model definition allow nesting of arbitrary level. This allows for namespaces for methods within your model.

Once a model is defined. Your ready to use it with Mongoose.

    Mongoose.load('./models/');
    
    User = Mongoose.get('User');
    
    user = new User({username : 'test', first : 'me', last : 'why', bio : { age : 100 }}); // create a new document.
    user.save(); //save
    
    User.find()


Configuration
-----------------------

Mongoose can help manage your connections with the configuration option to help with switching between dev and production environments.

    var Mongoose = require('./mongoose/).Mongoose;
    Mongoose.configure({
      connections : {
        dev : 'mongodb://localhost/dev',
        live : 'mongodb://localhost/live'
      }
    });
    
    store = Mongoose.connect('dev');    
    
In addition Mongoose has a featured we refer to as 'activeStore' This allows for implicit binding of Models/Collections.

    Model = Mongoose.Model,
    Mongoose.configure({
      activeStore : 'dev',
      connection : {...}
    });
    
    Mongoose.load('./models/'); // if a directory, loads all files in directory.
    
    User = Model.get('User'); // no need to define storage since activeStore is set

If 'activeStore' is not defined, it will be defined as soon as you connect(uri). If you want to disable this feature in the configuration object add 'activeStoreEnabled : false'.


Plugins
-------

Mongoose supports a plugin architecture. This allows you to add dynamic mixins to your models.

More to be announced soon.


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
- More examples.
- Add tests.
- More robust Model type declaration
- Ability to define foreign keys
- Add Inheritance to Models.

Revisions
---------
