var object = require('../utils/object'),
    QueryWriter = require('./queryWriter').QueryWriter,
    ObjectID = require('mongodb/bson/bson').ObjectID;

this.Static = {

    loaded : false,
    halted : false,

    buffer : [],

    find : function(){ return this._cmd('find',arguments); },
    update : function(){ return this._cmd('update',arguments); },
    updateAll : function(){ return this._cmd('updateAll',arguments); },
    upsert : function(){ return this._cmd('upsert',arguments); },
    upsertAll : function(){ return this._cmd('upsertAll', arguments); },
    insert  : function(){ return this._cmd('insert',arguments); },
    count   : function(){ return this._cmd('count', arguments); },
    distinct: function(){ return this._cmd('distinct', arguments); },
    mapReduce: function(){ return this._cmd('mapReduce', arguments); },
    remove: function(){ return this._cmd('remove', arguments); },
    save : function(){ return this._cmd('save', arguments); },
    drop : function(fn){ return this.store.dropCollection(this.collectionName, ((typeof fn == 'function') ? fn : function(){}) ); },
    close : function(){ this.store.db.close(); },
    indexInformation : function(){ return this._cmd('indexInformation', arguments); },
    createIndex : function(){ return this._cmd('createIndex', arguments); },
    dropIndex : function(){ return this._cmd('dropIndex', arguments); },
    dropIndexes : function(){ return this._cmd('dropIndexes', arguments); },
    
    
    findAndModify : function(){},
    
    findById: function(id,hydrate){
      return this.find({_id: ObjectID.createFromHexString(id)}).one(function(doc){
          this.result(doc);
      },hydrate);
    },
    
    _cmd : function(cmd,args){ 
      return new QueryWriter(cmd,Array.prototype.slice.call(args,0),this); 
    },
    
    toBuffer : function(queryWriterObj){
      this.buffer.push(queryWriterObj);
      this.dequeue();
    },

    dequeue : function(){
      if(!this.buffer.length || !this.loaded || this.halted) return;
      var query = this.buffer.shift();
      
      if(query.args[0] && Object.prototype.toString.call(query.args[0]) == '[object Object]'){
        var obj = {};
        for(i in query.args[0]) obj[i] = query.args[0][i];
        query.args[0] = obj;        
      }
      
      query.args.push(query.callback || function(){});

      this.collection[query.name].apply(this.collection,query.args); 
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
    }
    
};