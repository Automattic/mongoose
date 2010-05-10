
var Type = require('./type').Type,
    Validator = require('./validator').Validator,
    
    Schema = function(instance){
      this.mongoose = instance;
      this.Type = new Type(instance);
      this.Validator = new Validator(instance);
    };
    
    Schema.prototype = {
      
    };
    
this.Schema = Schema;