
  var Plugin = function(instance){
    this.mongoose = instance;
    this.mongoose.addDefiner('plugin',this);
  }
  
  Plugin.prototype = {
  
  plugins : {},
  
    define : function(plugin){
      if(this.plugins[plugin.name]) this.mongoose.emit('error','Plugin define ['+plugin.name+'] already exists.');
      else {
        var pluginClass = function(instance){ this.mongoose = instance; };
  //      pluginClass.prototype = plugin;
        var p = new pluginClass(this.mongoose);
        for(i in plugin){
          if(typeof plugin[i] == 'function') p[i] = plugin[i].bind(p);
          else p[i] = plugin[i];
        }
        this.plugins[plugin.name] =  p;
        if(typeof this.plugins[plugin.name].define == 'function'){
          this.mongoose.addDefiner(plugin.name, this.plugins[plugin.name]);
        }
      }
    },
    
    preFilter : function(model,def){
      for(i=0,l=this.plugins.length; i < l; i++) 
        if(typeof this.plugins[i].preFilter == 'function') this.plugin[i].preFilter(model,def);
    },
    
    filter : function(model,def){
      for(i in this.plugins){
        if(typeof this.plugins[i].filter == 'function') this.plugins[i].filter(model,def);
      }
    }
    
  };
  
  
this.Plugin = Plugin;