
var QueryPromise = require('./queryPromise').QueryPromise;

this.Static = {

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
    save : function(){ return this._cmd('save', Array.prototype.slice.call(arguments,0)); },
    drop : function(fn){ return this.store.dropCollection(this.collectionName, ((typeof fn == 'function') ? fn : function(){}) ); },
    close : function(){ this.store.db.close(); },
    indexInformation : function(){ return this._cmd('indexInformation', Array.prototype.slice.call(arguments,0)); },
    
    _cmd : function(cmd,args){ return new QueryPromise(cmd,args,this); },

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
    }
    
};