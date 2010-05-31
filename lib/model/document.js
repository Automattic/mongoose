var object = require('../utils/object'),
    isArray = function(arr){ return Object.prototype.toString.call(arr) == '[object Array]'; },
    sys = require('sys'),
    
    Document = function(data,schema,getters,setters,strict,embedded,pkey){
      var i,l,field,self = this;
      Document.ensureField(this,'__doc',{});
      if(embedded){
        Document.ensureField(this,'__parent',embedded);
        Document.ensureField(this,'__pkey',pkey);
        Document.ensureField(this,'__dirty',false);
      }
      for(i=0,l=schema.length; i < l; i++){
        field = schema[i];
        getter = (getters && getters[field]) ? getters[field] : undefined;
        setter = (setters && setters[field]) ? setters[field] : undefined;
        if(object.type(field)){ // nested structure?
          for(prop in field){
            getter = (getters && getters[prop]) ? getters[prop] : undefined;
            setter = (setters && setters[prop]) ? setters[prop] : undefined;
            
            if(isArray(field[prop])){ // only arrays are accepted in nested structures
              if(!field[prop].length) Document.Array(data,this,prop);
              else if(isArray(field[prop][0])){ // embeddable object array
                if(!field[prop][0].length) Document.Array(data,this,prop);
                else Document.EmbedArray(data[prop]||{},schema[i][prop][0],getter,setter,strict,this,prop);
              }
              else {
                Document.Embed(data[prop]||{},schema[i][prop],getter,setter,strict,this,prop);
              }
            }
          }
        } else {
          if(!object.type(this[field])){
            Document.addGetter(this,field,getter,true);
            Document.addSetter(this,field,setter,true);     
            this[field] = (data) ? data[field] : undefined; // filters data through setter and saves to __doc
          }
        }
        // delete for faster customer data/getter/setter looping
        if(data && data[field]) delete data[field];
        if(getters && getters[field]) delete getters[field];
        if(setters && setters[field]) delete setters[field];
      }
  
      if(!strict) Document.call(this,data,data,undefined,undefined,strict);
  //    for(g in getters) Document.addGetter(this,g,getters[g]);
  //    for(s in setters) Document.addSetter(this,s,setters[s]);
  
      return this;
    };
    
    Document.Embed = function(data,schema,getters,setters,strict,scope,pkey){
      scope.__doc[pkey] = {}; scope[pkey] = {};
      var doc = new Document(data,schema,getters,setters,strict,scope,pkey);
  //    Document.addGetter(scope,pkey,null,true);
  //    Document.addSetter(scope,pkey,null,true);
    };

    Document.Array = function(data,scope,pkey){
      scope.__doc[pkey] = (data[pkey] && isArray(data[pkey])) ? object.clone(data[pkey]) : [];
      Document.addGetter(scope,prop,true); // add array wrappers to mark dirty?
    };

    Document.EmbedArray = function(data,schema,getters,setters,strict,scope,pkey){
      var arr = scope.__doc[pkey] = [],
          internal = [],  
          Doc = function(obj){ Document.call(this,obj,schema,getters,setters,strict,scope,pkey); };
          object.addMethod(Doc.prototype,'remove',function(){
            if(this.__parent && !isNaN(this.__idx)){
              this.__parent[this.__pkey].splice(this.__idx,1);
              internal.splice(this.__idx,1);
              for(i=this.__idx,l=internal.length; i<l; i++) internal[i].__idx--;
              this.__makeDirty();
            }
          });    
          
      arr.push = function(item){ 
        var doc = new Doc(item);
            idx = internal.push(doc) - 1;
            arr[idx] = doc.__doc;
            ensureField(doc,'__idx',idx);
            return doc;
      };
      
      arr.forEach = function(func,scope){
        for(i=0,l=internal.length;i<l;i++) func.call(scope,internal[i],i);
      }
      
    };

    Document.addGetter = function(scope,field,getter,enum){
      sys.puts('adding getter.... '+field);
      object.addGetter(scope,field,function(){
        return (typeof getter == 'function') ? getter.call(scope,scope.__doc[field]) : scope.__doc[field];
      },enum);
    };

    Document.addSetter = function(scope,field,setter,enum){
      object.addSetter(scope,field,function(val){
        val = (object.type(val.__doc)) ? val.__doc : val;
        if(scope.__idx) scope.__doc[field][scope.__idx] = val;
        else scope.__doc[field] = (typeof setter == 'function') ? setter.call(scope,val) : val;
        if(scope.__parent){
          if(scope.__idx) scope.__parent.__doc[scope.__pkey][scope.__idx] = val;
          else scope.__parent.__doc[scope.__pkey] = scope.__doc;
          scope.__parent.__dirty = true;
        }
        scope.__dirty = true;        
      },enum);
    };

    Document.ensureField = function(scope,field,val){
      if(!scope[field]) 
        Object.defineProperty(scope,field,{value: val, writable: true, enumerable: false, configurable: true});
    };
    
// expose public API
this.Document = Document;