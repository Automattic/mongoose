
var Validator = function(instance){
  this.mongoose = instance;
  this.mongoose.addDefiner('validator',this.define);
}

Validator.prototype = {
  
  define : function(validation){
    
  }
  
}

this.Validator = Validator;