
Mongoose.define('plugin',{
  
  name : 'inherits',
  
  preFilter : function(model,def){
    if(!def.inherits) return;
    var inherit = Object.clone(this.mongoose.Model.models[def.inherits].definition);
    
    addMethods(model,inherit.static,true,model);
    addMethods(model.prototype,inherit.methods);
    
    Object.merge(def.types, inherit.types);
    Object.merge(def.getters, inherit.getters);
    Object.merge(def.setters, inherit.setters);
  }
  
})