var sys = require('sys'),
    object = require('../lib/utils/object'),
    inspect = function(item){ sys.puts(sys.inspect(item)); },
    Mongoose = require('../../mongoose/').Mongoose, db, Simple;
    
    db = Mongoose.connect('mongodb://localhost/test'); // connect to mongo
    
    Simple = Mongoose.noSchema('simple',db); // no model, direct access to 'simple' collection.
    Simple.drop(); // empties collection
    
    var s1 = new Simple({x : 2, y : 3}).save(); // create a new document and save

    Simple.find().one(function(doc){ // query for documents in 'simple' collection
    sys.puts('in each');
      inspect(doc); // output
      doc.y = 5;
      doc.save();
    },true).then(function(){ // promise (execute after query)
       Simple.close(); // close event loop
    });
    