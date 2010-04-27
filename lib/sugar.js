
  var Sugar = function(operation,model){
    this.op = operation;
    this.model = model;
  };
  
  Sugar.prototype = {
    
    each : function(callback){ // stopper
        var model = this.model;
        this.op.callback = function(err,cursor){
          if(err) model.emit('error',err);
          else cursor.each(function(err,doc){
            if(err) model.emit('error',err);
            else if(doc) callback(doc);
          });
        };
        this.model.dequeue();
        return this.model;
    },

    one : function(callback){ // stopper
        var model = this.model;
        this.op.callback = function(err,cursor){ 
          if(err) model.emit('error',err);
          else cursor.nextObject(function(err,doc){
            if(err) model.emit('error',err);
            else if(doc) callback(doc);
          });
          return this.model;
        };   
        this.model.dequeue();
        return this.model;
    },

    count : function(callback){ // stopper
      this.model.dequeue();
      return this.model;
    },

    run : function(callback){ // stopper for mapReduce
      this.model.buffer.push(this.op);
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
    Sugar.prototype[cmd] = function(){
      while(this.op.args.length < 3) this.op.args.push({});
      this.op.args[2][cmd] = arguments[0];
      return this;    
    }
  });
  
  ['in','nin','ne','gt','gte','lt','lte',
  'min','max','mod','all','size','exists',
  'type','not'].forEach(function(cmd){
      Sugar.prototype[cmd] = function(modifier){
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
      Sugar.prototype[cmd] = function(modifier){
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

  
this.Sugar = Sugar;