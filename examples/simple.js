var sys = require('sys'),
    inspect = function(item){ sys.puts(sys.inspect(item)); },
    Mongoose = require('../../mongoose/').Mongoose, db, Simple;
    
    db = Mongoose.connect('mongodb://localhost/test'); // connect to mongo
    
    Simple = Mongoose.noSchema('simple',db); // no model, direct access to 'simple' collection.
    
    var s1 = new Simple({x : 2, y : 3}).save(); // create a new document and save
    
    Simple.find().each(function(doc){ // query for documents in 'simple' collection
      inspect(doc); // output
    }).then(function(){ // promise (execute after query)
      Simple.drop(function(){ // clear collection
        Simple.close(); // close event loop
      });
    });
    