
  require.paths.unshift(__dirname + '/models');
  var sys = require('sys'),

    mongoose = require('../../mongoose/').configure({
            dev : { master : { host : 'localhost',  port : 27017, name : 'test', options : {auto_reconnect : true}} }
        }),      
    devStore = mongoose.connect('dev'),
    models = require('../lib/model').Model,
    
    User = models.load('User',devStore);
    
    
    User.find({'age':{'$gt':10}}).one(function(item){
        sys.puts('------ age greater then 1 -------\n');
        sys.puts(sys.inspect(item));
        sys.puts('\n---------------------------------\n');    
    })
    
//    User = require('mongoose').Storage
//            .connect({host: 'localhost', port : 34324})
//            .loadModel('./models/User');
    
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
    
//    Models = require('mongoose').Storage
//            .connect({host: 'localhost', port : 34324})
//            .loadModels('./models/');  
    
  