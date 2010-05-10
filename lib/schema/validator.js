
var Validator = function(instance){
  this.mongoose = instance;
  this.mongoose.addDefiner('validator',this);
}

Validator.prototype = {
  
  define : function(validation){
    
  }
  
}

this.Validator = Validator;