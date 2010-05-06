var sys = require('sys'),
    Mongoose = require('../../mongoose/').Mongoose;
    
    Mongoose.addListener('error',function(msg){
      sys.puts(msg);
    });
      
    Mongoose.configure({
          activeStore : 'test',
          connections : {
            'dev' : 'mongodb://localhost/dev',
            'live' : 'mongodb://localhost/production',
            'test' : 'mongodb://localhost/test'
          },
          loadAddons : false
 /*         load : [
            '/nw/lb/mongoose/examples/models/types/',
            '/nw/lb/mongoose/examples/models/validators/',
            '/nw/lb/mongoose/examples/models/plugins/',
            '/nw/lb/mongoose/examples/models/plugins/behaviors/',
            '/nw/lb/mongoose/examples/models/'
          ] */
      }),
      
      User = Mongoose.noSchema('user');
      
      User.find().gte({age : 30}).limit(1).each(function(item){
          sys.puts(sys.inspect(item));
          
      });
      
