
var Type = function(instance){
  this.mongoose = instance;
  this.mongoose.addDefiner('type',this.define);
}

Type.prototype = {
  
  define : function(type){
    
  }
  
}

this.Type = Type;