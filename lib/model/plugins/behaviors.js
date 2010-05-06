
Mongoose.define('plugin',{
  
  name : 'behavior',
  
  behaviors : {},
  
  define : function(behavior){
    if(this.behaviors[behavior.name]) Mongoose.emit('error','Plugin Behavior define ['+behavior.name+'] already exists.');
    else this.behaviors[behavior.name] = behavior;
  },
  
  filter : function(model){
    if(model.behaviors && (typeof model.behaviors == 'array')) 
      for(i=0,l=model.behaviors; i<l; i++){
        var behavior = this.behaviors[model.behaviors[i]];
        if(behavior){
          Mongoose.merge(model.static, behavior.static)
          Mongoose.merge(model.exports,behavior.exports);
        } 
      }
  }
  
});

