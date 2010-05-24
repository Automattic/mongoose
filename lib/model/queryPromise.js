
  var QueryPromise = function(){
    
    this.completed = false;
    this.results = undefined;
    this.partials = [];
    this.errors = [];
    this.defers = [];
    
    return this;
  };
  
  QueryPromise.prototype = {
    
    result : function(result){
      this.results = result;
      return this;
    },
    
    partial : function(part){
      this.partials.push(part);
      return this;
    },
    
    error : function(err){
      this.errors.push(err);
      return this;
    },
    
    complete : function(){
      this.completed = true;
      this.continuable();
      return this;
    },
    
    then : function(fn,err){
      this.defers.push([fn,err]);
      if(this.completed) this.continuable();
      return this;
    },
    
    continuable : function(){
      while(this.defers.length){
        var defer = this.defers.shift();
        if(this.errors.length){ 
         if(typeof defer[1] == 'function') defer[1](this.errors); 
        }
        else defer[0]((this.results == undefined) ? this.partials : this.results);
      }
    }
    
  };

this.QueryPromise = QueryPromise;