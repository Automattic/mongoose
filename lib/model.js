

var Class = require('./support/class/lib/class').Class,
    Collection = require('./support/mongodb/lib/mongodb/collection').Collection
    sys = require('sys'),
    path = '',
    models = {},

this.Doc = Doc = new Class({
  
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
  
});

var Manager = new Class({
  
  models : [],
  path : '',
  
  constructor : function(){
  },
  
  
  configure : function(options){
    if(options.path) this.path = options.path;
    return this;
  },
  
  load : function(name,store,callback){
    var id = name + ':' + store.id;
    if(!this.models[id]) this.compile(id,require(this.path+name)[name],store,callback);
    if(this.models[id].loaded) callback(this.models[id]);
    else this.models[id].addListener('onLoad',callback);
  },
  
  compile : function(id,doc,store,callback){
      var schema = doc.prototype.schema,
          collectionName = doc.prototype.name;
      
      doc.loaded = false;

      for(i in process.EventEmitter.prototype) doc[i] = process.EventEmitter.prototype[i].bind(doc);
      process.EventEmitter.call(doc);
          
      if(store.collections[collectionName]) doc.prototype.store = store.collections[collectionName];
      else {
        store.openCollection(collectionName,function(collection){
            doc.prototype.store = collection;

            collection.createIndex(doc.prototype.indexes,function(err,resp){}); // ensures indexes

            for(cmd in collection) if(cmd != 'db' && cmd != 'collectionName' && cmd != 'hint') doc[cmd] = collection[cmd].bind(collection);
            
            doc.loaded = true;
            doc.emit('onLoad',doc);
        });
      }
      this.models[id] = doc;
      return doc;    
  }
  
});

    
this.Model = new Manager();