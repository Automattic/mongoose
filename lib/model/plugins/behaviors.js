
Mongoose.define('plugin',{
  
  name : 'behavior',
  
  behaviors : {},
  
  define : function(behavior){
    if(this.behaviors[behavior.name]) Mongoose.emit('error','Plugin Behavior define ['+behavior.name+'] already exists.');
    else this.behaviors[behavior.name] = behavior;
  },
  
  filter : function(model,def){
    if(def.behaviors && def.behaviors.length){
      for(i=0,l=def.behaviors.length; i<l; i++){
        var behavior = this.behaviors[def.behaviors[i]];
        if(behavior){
          Mongoose.merge(def.types, behavior.types);
          Mongoose.merge(def.getters, behavior.getters);
          Mongoose.merge(def.setters, behavior.setters);
          Mongoose.merge(def.static, behavior.static);
          Mongoose.merge(def.methods,behavior.methods);
        } 
      }
    }
  }
  
});

