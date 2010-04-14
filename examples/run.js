
  require.paths.unshift(__dirname + '/models');
  var Class = require('../lib/support/class/lib/class').Class,
    sys = require('sys'),

    mongoose = require('../../mongoose/').configure({
            dev : { master : { host : 'localhost',  port : 27017, name : 'test', options : {auto_reconnect : true}} }
        }),      
    devStore = mongoose.connect('dev'),
    models = require('../lib/model').Model,
    
    Example = new Class({
  
      constructor : function(){
        models.load('User',devStore,this.init.bind(this));
      },

      init : function(User){
        var u = new User({name : 'nathan', age : 32});
        u.save();
          
          
          var objs = [];
          ['Ronald','Jack','Paul'].forEach(function(name,idx){
            objs.push({'name' : name, age : idx });
          });
          
          User.insert(objs);
          
          User.count(function(err,count){
            sys.puts('there are ' + count + ' items');
          });
          
         
          User.find({'age':{'$gt':1}},function(err,cursor){
            cursor.each(function(err,item){
              if(item !== null){
                sys.puts('------ age greater then 1 -------\n');
                sys.puts(sys.inspect(item));
                sys.puts('\n---------------------------------\n'); 
              }
            })
          });
         
          User.find({'age':{'$in':[1,2]}}, function(err,cursor){
            cursor.each(function(err,item){
              if(item !== null){
                sys.puts('------ age is 1 or 2 using in-------\n');
                sys.puts(sys.inspect(item));
                sys.puts('\n---------------------------------\n'); 
              }
            })       
          });
          
          User.find({'name':/^(R|J)/}, function(err,cursor){
            cursor.each(function(err,item){
              if(item !== null){
                sys.puts('------ name starts with R or J using regex -------\n');
                sys.puts(sys.inspect(item));
                sys.puts('\n---------------------------------\n'); 
              }
            })         
          });
          
          
          User.find({}, {'skip':1, 'limit':1, 'sort':'age'},function(err,cursor){
            cursor.each(function(err,item){
              if(item !== null){
                sys.puts('------ sort skip and limit -------\n');
                sys.puts(sys.inspect(item));
                sys.puts('\n---------------------------------\n'); 
              }
            })         
          });
         
          User.find(function(err, cursor) {
            cursor.each(function(err, item) {
              if(item != null) sys.puts(sys.inspect(item));
              // Null signifies end of iterator
              if(item == null) {                
                // Destory the collection
                User.drop(function(){});
              }
            });
          });          

      }

    });
    

new Example();