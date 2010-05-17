
  var QueryPromise = function(cmd,args,model){
    
    this.completed = false;
    this.results = undefined;
    this.partials = [];
    this.errors = [];
    this.defers = [];
    
    this.model = model;
    this.op = { 
              name : cmd,
              callback : (args.length) ? ( (args[args.length-1] instanceof Function) ? args.pop() : null ) : null,
              args : args 
            };
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
    },
    
    process : function(){
      if(this.op.args[0] && Object.prototype.toString.call(this.op.args[0]) == '[object Object]'){
        var obj = {};
        for(i in this.op.args[0]) obj[i] = this.op.args[0][i];
        this.op.args[0] = obj;        
      }

      this.model.buffer.push(this.op);
      this.model.dequeue();
      return this;
    },
  
    each : function(callback,hydrate){ // action
        var model = this.model, self = this, callback = callback.bind(this);
        this.op.callback = function(err,cursor){
          if(err) self.error(err);
          else cursor.each(function(err,doc){
            if(err) self.error(err);
            else { 
              if(doc != null) callback((hydrate) ? new model(doc) : doc);
              else self.complete();
            } 
          });
        };
        return this.process();
    },

    get : function(callback,hydrate){ // action
        var model = this.model, self = this;
        this.op.callback = function(err,cursor){ 
          if(err) self.error(err);
          else cursor.nextObject(function(err,doc){
            if(err) self.error(err);
            else if(doc) callback.call(self, ((hydrate) ? new model(doc) : doc) );
            self.complete();
          });
        };
        return this.process();
    },
    
    execute : function(callback){ // action
      var model = this.model, self = this;
      this.op.callback = function(err,resp){
        if(err) self.error(err);
        else if(callback) callback.call(self,resp);
        self.complete();
      };
      return this.process();
    },
    
    snapshot : function(){
      while(this.op.args.length < 3) this.op.args.push({});
      this.op.args[2].snapshot = true;
      return this;
    },
    
    explain : function(){
      while(this.op.args.length < 3) this.op.args.push({});
      this.op.args[2].explain = true;
      return this;
    },
    
    where : function(clause){
      if(!this.op.args.length) this.op.args.push({});
      this.op.args[0].$where = clause.toString();
      return this;
    }
    
  };
  
  ['sort','limit','skip','hint','timeout'].forEach(function(cmd){
    QueryPromise.prototype[cmd] = function(){
      while(this.op.args.length < 3) this.op.args.push({});
      this.op.args[2][cmd] = arguments[0];
      return this;    
    }
  });
  
  ['in','nin','ne','gt','gte','lt','lte',
  'min','max','mod','all','size','exists',
  'type','not'].forEach(function(cmd){
      QueryPromise.prototype[cmd] = function(modifier){
        if(!this.op.args.length) this.op.args.push({});
        for(i in modifier){
          if(!(this.op.args[0][i] instanceof Object)) this.op.args[0][i] = {};
          this.op.args[0][i]['$'+cmd] = modifier[i];
        }
        return this;
      };
  });
  
// atomic similar
  
  ['inc','set','unset','push','pushAll',
  'addToSet','pop','pull','pullAll'].forEach(function(cmd){
      QueryPromise.prototype[cmd] = function(modifier){
        if(this.op.name.charAt(0) != 'u') return this;
        if(!this.op.args.length) this.op.args.push({},{});
        if(this.op.args.length == 1) this.op.args.push({});
        for(i in modifier){
          if(!(this.op.args[1][i] instanceof Object)) this.op.args[1][i] = {};
          this.op.args[0][i]['$'+cmd] = modifier[i];
        }
        return this;
      }
  });

  QueryPromise.prototype.one = QueryPromise.prototype.get;
  QueryPromise.prototype.first = QueryPromise.prototype.get;
  
  QueryPromise.prototype.run = QueryPromise.prototype.execute;
  QueryPromise.prototype.exec = QueryPromise.prototype.execute;
  QueryPromise.prototype.count = QueryPromise.prototype.execute; 
  
this.QueryPromise = QueryPromise;