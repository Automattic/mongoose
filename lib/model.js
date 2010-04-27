

var Class = require('./support/class/lib/class').Class,
    sys = require('sys'),
  
    Manager = new Class({

        models : {},
        
        load : function(name,store,options){
          var options = options || {};
          var id = name + ':' + store.id;
          
          if(options.noSchema) id += ':noSchema';
          if(!this.models[id]) this.compile(id, (options.noSchema) ? Doc : require(this.path+name)[name], store, name);
          
          return this.models[id];
        },
        
        compile : function(id,doc,store,collection){
        
            var schema = doc.prototype.schema,
                collectionName = doc.prototype.name || collection,
                static = {

                    name : collectionName,
                    loaded : false,
                    halted : false,

                    buffer : [],

                    find    : function(){ return this._cmd('find',Array.prototype.slice.call(arguments,0)); },
                    update  : function(){ return this._cmd('update',Array.prototype.slice.call(arguments,0)); },
                    updateAll : function(){},
                    upsert : function(){},
                    upsertAll : function(){},
                    // upsert is the most complicated (its an update with an option flag)
                    insert  : function(){ return this._cmd('insert',Array.prototype.slice.call(arguments,0)); },
                    count   : function(){ return this._cmd('count', Array.prototype.slice.call(arguments,0)); },
                    distinct: function(){ return this._cmd('distinct', Array.prototype.slice.call(arguments,0)); },
                    mapReduce: function(){ return this._cmd('mapReduce', Array.prototype.slice.call(arguments,0)); },
                    remove: function(){ return this._cmd('remove', Array.prototype.slice.call(arguments,0)); },

                    _cmd : function(cmd,args){
                      var operation = { 
                            name : cmd,
                            callback : (args.length) ? ( (args[args.length-1] instanceof Function) ? args.pop() : null ) : null,
                            args : args 
                          };
                          
                      this.buffer.push(operation);
                      if(!operation.callback) return new Sugar(operation,this);
                      this.dequeue();
                    },

                    dequeue : function(){
                      if(!this.buffer.length || !this.loaded || this.halted) return;
                      var op = this.buffer.shift();
                      op.args.push(op.callback || function(){})
                      this.collection[op.name].apply(this.collection,op.args);
                      this.dequeue();
                    },
                    
                    halt : function(){
                      this.halted = true;
                      return this;
                    },
                    
                    resume : function(){
                      this.halted = false;
                      this.dequeue();
                      return this;
                    },
                    
                    clear : function(){
                      this.buffer = [];
                      return this;
                    },
                    
                    onLoad : function(collection){
                        this.collection = collection;
                        this.loaded = true;
                        this.dequeue();
                    }

                };

            // create static interface
            for(i in static) doc[i] = (static[i] instanceof Function) ? static[i].bind(doc) : static[i];
            
            // add events
            for(i in process.EventEmitter.prototype) doc[i] = process.EventEmitter.prototype[i].bind(doc);
            process.EventEmitter.call(doc);
            
            doc.addListener('onLoad', doc.onLoad);

            if(store.collections[collectionName]) doc.collection = store.collection[collectionName];
            else{
              store.openCollection(collectionName,function(collection){
                doc.collection = collection;
                collection.createIndex(doc.prototype.indexes,function(err,resp){}); // ensures indexes
                doc.emit('onLoad',collection);
              })
            }
            
            this.models[id] = doc;
      },

    }),
    
    Doc = new Class({

        constructor : function(obj){
            var schema = this.schema;
            for(key in schema){
              if(!obj[key]){
                if(schema[key].if_missing) schema[key].value = schema[key].if_missing;
                else sys.puts('error: missing required data field');
              } else {
                schema[key].value = obj[key];
              }
              this.schema[key].state = 'dirty',

              this.__defineGetter__(key,function(key){
                return this.schema[key].value;
              }.bind(this,[key]));
              this.__defineSetter__(key,function(val,key){
                this.schema[key].value = val; // need to add validation and make dirty
              }.bind(this,[key]));
            }
            return this;
        },

        save : function(){
          var obj = {};
          for(i in this.schema) obj[i] = this.schema[i].value; 

          this.store.insert(obj,function(err,resp){
              for(key in resp){
                if(key == '_id' && !this.schema[key]) this.schema[key] = { value : resp[key], state : 'clean' };
              }
          });
        }

    }),
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
    
    
this.Model = new Manager();
this.Doc = Doc;