Mongoose: MongoDB utility library with ORM-like functionality
===============================================================

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


