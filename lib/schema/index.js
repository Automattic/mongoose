
var Type = require('./type').Type,
    Validator = require('./validator').Validator,
    
    Schema = function(instance){
      this.mongoose = instance;
      this.Type = new Type(instance);
      this.Validator = new Validator(instance);
    };
    
    Schema.prototype = {
      
      instance : function(obj,scope,model,schema){
        for(prop in schema){

          obj.__defineGetter__(prop,function(key){

          }.bind(scope,[prop]));

          obj.__defineSetter__(prop,function(val,key){

          }.bind(scope,[prop]));

          if(schema[prop].object && (typeof schema[prop].object == 'object')) 
            Schema.instance(obj[prop],scope,model,schema[prop]);
        }
      }
      
    };
    
this.Schema = Schema;