
  var Plugin = function(instance){
    this.mongoose = instance;
    this.mongoose.addDefiner('plugin',this);
  }
  
  Plugin.prototype = {
  
  plugins : {},
  
    define : function(plugin){
      if(this.plugins[plugin.name]) this.mongoose.emit('error','Plugin define ['+plugin.name+'] already exists.');
      else {
        var aPlugin = function(instance){ this.mongoose = instance; return this; };
        aPlugin.prototype = plugin;
        this.plugins[plugin.name] = new aPlugin();
        if(this.plugins[plugin.name].define == 'function')
          this.mongoose.addDefiner(plugin.name, this.plugins[plugin.name].define);
      }
    },
    
    preFilter : function(model,def){
      for(i=0,l=this.plugins.length; i < l; i++) 
        if(this.plugins[i].preFilter instanceof Function) this.plugin[i].preFilter(model,def);
    },
    
    filter : function(model,def){
      for(i=0,l=this.plugins.length; i < l; i++)
        if(this.plugins[i].filter instanceof Function) this.plugin[i].filter(model,def);
    }
    
  };
  
  
this.Plugin = Plugin;