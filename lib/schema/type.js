
var Type = function(instance){
  this.mongoose = instance;
  this.mongoose.addDefiner('type',this);
}

Type.prototype = {
  
  define : function(type){
    
  }
  
}

this.Type = Type;