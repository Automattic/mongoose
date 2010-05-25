var QueryPromise = require('./queryPromise').QueryPromise,

  QueryWriter = function(cmd,args,model){
    this.model = model;
    this.name = cmd;
    this.callback = (args.length) ? ( (args[args.length-1] instanceof Function) ? args.pop() : null ) : null;
    this.args = args;
    this.promise = new QueryPromise();
    
    if(cmd == 'updateAll' || cmd == 'upsert' || cmd == 'upsertAll'){
      if(this.args.length == 0) this.args.push({},{},{});
      else if(this.args.length == 1) this.args.push({},{});
      else if(this.args.length == 2) this.args.push({});
      if(cmd == 'updateAll' || cmd == 'upsertAll') this.args[2].multi = true;
      if(cmd == 'upsert' || cmd == 'upsertAll') this.args[2].upsert = true;
      this.name = 'update';
    }
    
    if(this.callback) return this.execute(this.callback);
    return this;
  };
  
  QueryWriter.prototype = {
    
    process : function(){
      this.model.toBuffer(this);
      return this.promise;
    },
    
    each : function(callback,hydrate){ // action
        var model = this.model, self = this, callback = callback.bind(this.promise);
        this.callback = function(err,cursor){
          if(err) self.promise.error(err);
          else cursor.each(function(err,doc){
            if(err) self.promise.error(err);
            else { 
              if(doc != null) callback((hydrate) ? new model(doc) : doc);
              else self.promise.complete();
            } 
          });
        };
        return this.process();
    },
    
    toArray : function(callback,hydrate){
      
    },

    get : function(callback,hydrate){ // action
        var model = this.model, self = this;
        this.callback = function(err,cursor){ 
          if(err) self.promise.error(err);
          else cursor.nextObject(function(err,doc){
            if(err) self.promise.error(err);
            else if(doc) callback.call(self.promise, ((hydrate) ? new model(doc) : doc) );
            self.promise.complete();
          });
        };
        return this.process();
    },
    
    execute : function(callback){ // action
      var self = this;
      this.callback = function(err,resp){
        if(err) self.promise.error(err);
        else if(callback) callback.call(self.promise,resp);
        self.promise.complete();
      };
      return this.process();
    },
    
    snapshot : function(){
      while(this.args.length < 3) this.args.push({});
      this.args[2].snapshot = true;
      return this;
    },
    
    explain : function(){
      while(this.args.length < 3) this.args.push({});
      this.args[2].explain = true;
      return this;
    },
    
    where : function(clause){
      if(!this.args.length) this.args.push({});
      this.args[0].$where = clause.toString();
      return this;
    }
    
  };
  
  ['sort','limit','skip','hint','timeout'].forEach(function(cmd){
    QueryWriter.prototype[cmd] = function(){
      while(this.args.length < 3) this.args.push({});
      this.args[2][cmd] = arguments[0];
      return this;    
    }
  });
  
  ['in','nin','ne','gt','gte','lt','lte',
  'min','max','mod','all','size','exists',
  'type','not'].forEach(function(cmd){
      QueryWriter.prototype[cmd] = function(modifier){
        if(!this.args.length) this.args.push({});
        for(i in modifier){
          if(Object.prototype.toString.call(this.args[0][i]) != '[object Object]') this.args[0][i] = {};
          this.args[0][i]['$'+cmd] = modifier[i];
        }
        return this;
      };
  });
  
  ['inc','set','unset','push','pushAll',
  'addToSet','pop','pull','pullAll'].forEach(function(cmd){
      QueryWriter.prototype[cmd] = function(modifier){
        if(this.name.charAt(0) != 'u') return this;
        if(!this.args.length) this.args.push({},{});
        if(this.args.length == 1) this.args.push({});
        for(i in modifier){
          if(Object.prototype.toString.call(this.args[1]['$'+cmd]) != '[object Object]') this.args[1]['$'+cmd] = {};
          this.args[1]['$'+cmd][i] = modifier[i];
        }
        return this;
      }
  });

  QueryWriter.prototype.one = QueryWriter.prototype.get;
  QueryWriter.prototype.first = QueryWriter.prototype.get;
  
  QueryWriter.prototype.run = QueryWriter.prototype.execute;
  QueryWriter.prototype.exec = QueryWriter.prototype.execute;
  QueryWriter.prototype.count = QueryWriter.prototype.execute; 
  
this.QueryWriter = QueryWriter;