
  var Plugin = function(instance){
    this.mongoose = instance;
    this.mongoose.addDefiner('plugin',this.define);
  }
  
  Plugin.prototype = {
  
  plugins : {},
  
    define : function(plugin){
      if(this.plugins[plugin.name]) this.mongoose.emit('error','Plugin define ['+plugin.name+'] already exists.');
      else {
        var aPlugin = function(){};
        aPlugin.prototype = plugin;
        this.plugins[plugin.name] = new aPlugin();
        if(this.plugins[plugin.name].define == 'function')
          this.mongoose.addDefiner(plugin.name, this.plugins[plugin.name].define);
      }
    },
    
    filter : function(def){
      for(i=0,l=this.plugins.length; i < l; i++) 
        if(typeof this.plugins[i].filter == 'function') this.plugin[i].filter(def);
    }
    
  };
  
  
this.Plugin = Plugin;