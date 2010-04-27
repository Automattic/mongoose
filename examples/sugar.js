    var mongoose = require('../../mongoose/'),
          Storage = mongoose.connect('mongodb://localhost:27017/test'),
          User = Storage.bindModel('User');
    
    User.find({'age':{'$gt':10}}).each(function(item){
        sys.puts(sys.inspect(item));
    });
    
//    for(i = 0; i < 10; i++) User.insert({name : 'Nathan', age : (32+i)});
    
    
    
    
    
    
    
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
    
  