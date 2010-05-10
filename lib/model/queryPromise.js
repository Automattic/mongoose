
  var QueryPromise = function(cmd,args,model){
    this.model = model;
    this.op = { 
              name : cmd,
              callback : (args.length) ? ( (args[args.length-1] instanceof Function) ? args.pop() : null ) : null,
              args : args 
            };
    return this;
  };
  
  QueryPromise.prototype = {
    
    each : function(callback,hydrate){ // stopper
        var model = this.model;
        this.op.callback = function(err,cursor){
          if(err) model.emit('error',err);
          else cursor.each(function(err,doc){
            if(err) model.emit('error',err);
            else if(doc) callback((hydrate) ? new model(doc) : doc);
          });
        };
        this.model.buffer.push(this.op);
        this.model.dequeue();
        return this;
    },

    one : function(callback){ // stopper
        var model = this.model;
        this.op.callback = function(err,cursor){ 
          if(err) model.emit('error',err);
          else cursor.nextObject(function(err,doc){
            if(err) model.emit('error',err);
            else if(doc) callback((hydrate) ? new model(doc) : doc);
          });
          return this.model;
        };   
        this.model.buffer.push(this.op);
        this.model.dequeue();
        return this;
    },

    count : function(callback){ // stopper
      this.model.buffer.push(this.op);
      this.model.dequeue();
      return this;
    },

    run : function(callback){ // stopper for mapReduce
      this.model.buffer.push(this.op);
      this.model.dequeue();
      return this;
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
  
//  ['where'] special case
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

  
this.QueryPromise = QueryPromise;