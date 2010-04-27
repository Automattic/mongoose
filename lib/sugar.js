var Class = require('./support/class/lib/class').Class,

  /*   
   find().with('x').all([3,4,5]).push(3).each();
   
   Model.find().where().limit(10).skip(20).each(function(){
     
   });
   
   mapReduce(map,reduce).find().limit().run().each()
       .find().each()
       .find().each()
   
   mapReduce(map,reduce)
       .find().sort().limit().scope().verbose().
       .find().each();
       .find().each();
       .find().each();
       .find().each();
 */
  Sugar = new Class({
  
      constructor : function(operation,model){
          this.op = operation;
          this.get = this.one;
          this.model = model;
      },
      
      each : function(callback){ // stopper
          var model = this.model;
          this.op.callback = function(err,cursor){
            if(err) model.emit('error',err);
            else cursor.each(function(err,doc){
              if(err) model.emit('error',err);
              else if(doc) callback(doc);
            });
            return this.model;
          };
 //         this.model.buffer.push(operation);
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
//          this.model.buffer.push(operation);         
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
      
      put : function(){ // update
        
        return this;
      },
      
      set : function(obj){ // update
        return this;
      },
      
      unset : function(){ // update
        
        return this;
      },
      
      push : function(){ // update
        
        return this;
      },
      
      pushAll : function(){ // update
        
        return this;
      },
      
      addToSet : function(){ // update
        
        return this;
      },
      
      pop : function(){ // update
        
        return this;
      },
      
      unshift : function(){ // update
        
        return this;
      },
      
      pull : function(){ // update
        
        return this;
      },
      
      pullAll : function(){ // update
        
        return this;
      },
      
      distinct : function(){ // query
        
      },
      
      slice : function(){ // query
        
        return this;
      },
      
      'in' : function(){ // query
        // find().in(key,arr)
        
        return this;
      },
      
      nin : function(){ // query
        // not in
      },
      
      ne : function(){ // query
        
      },
      
      mod : function(){ // query
        
      },
      
      all : function(){ // query
        // like in but needs to match all
      },
      
      size : function(){ // query
        
      },
      
      exists : function(){ // query
        
      },
      
      type : function(){ // query matches to internal BSON
        
      },
      
      not : function(){ // query
        
      },
      
      where : function(){ // query
        
      },
      
      sort : function(){ // query
        
      },
      
      limit : function(){ // query
        
      },
      
      skip : function(){ // query
        
      },
      
      snapshot : function(){
        
      },
      
      hint : function(){
        
      }
      
  });
  
this.Sugar = Sugar;