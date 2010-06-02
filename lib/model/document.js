var object = require('../utils/object'),
    isArray = function(arr){ return Object.prototype.toString.call(arr) == '[object Array]'; },
    sys = require('sys'),
    
    Document = function(data,schema,getters,setters,strict,embedded,pkey,idx){
      var i,l,field,self = this;

      Document.ensureField(this,'__doc',{}); // internal storage (no getters/setters)
      if(embedded){
        Document.ensureField(this,'__parent',embedded);
        Document.ensureField(this,'__pkey',pkey); // the property in parent
        Document.ensureField(this,'__dirty',false);
      }
      if(!isNaN(idx)) Document.ensureField(this,'__idx',idx); // for embedded array docs
      
      for(i=0,l=schema.length; i < l; i++){
        field = spec = schema[i];
        getter = (getters && getters[field]) ? getters[field] : undefined;
        setter = (setters && setters[field]) ? setters[field] : undefined;
        if(object.type(spec)){ // nested structure?
          for(prop in spec){
            getter = (getters && getters[prop]) ? getters[prop] : undefined;
            setter = (setters && setters[prop]) ? setters[prop] : undefined;
            
            if(isArray(field[prop])){ // only arrays are accepted in nested structures
              if(!field[prop].length) Document.Array(data,this,prop,getters,setters);
              else if(isArray(field[prop][0])){ // embeddable object array
                if(!field[prop][0].length) Document.Array(data,this,prop,getters,setters);
                else (function(p,d,g,s){
                  Document.removeProperty(p,d,g,s);
                })(prop,data,getters,setters,
                  Document.EmbedArray(data[prop]||[],schema[i][prop][0],getter,setter,strict,this,prop));
              }
              else {
                (function(p,d,g,s){
                  Document.removeProperty(p,d,g,s);
                })(prop,data,getters,setters,
                 Document.Embed(data[prop]||{},schema[i][prop],getter,setter,strict,this,prop));
              }
            }
          }
        } else {
            Document.addGetter(this,field,getter,true);
            Document.addSetter(this,field,setter,true);     
            this[field] = (data) ? data[field] : undefined; // filters data through setter and saves to __doc
            Document.removeProperty(field,data,getters,setters);
        }
      }

      if(!strict){
        var schema = [];
        for(i in data) schema.push(i);
        if(schema.length) Document.call(this,data,schema,undefined,undefined,strict);
      }
      
      for(g in getters) Document.addGetter(this,g,getters[g]);      
      for(s in setters) Document.addSetter(this,s,setters[s]);

      return this;
    };
    
    Document.Embed = function(data,schema,getters,setters,strict,scope,pkey,del){
      var doc = new Document(data,schema,getters,setters,strict,scope,pkey);
      scope.__doc[pkey] = doc.__doc;
      scope.__defineGetter__(pkey,function(){ return doc; });
    };

    Document.Array = function(data,scope,pkey,getters,setters){
      scope.__doc[pkey] = (data[pkey] && isArray(data[pkey])) ? object.clone(data[pkey]) : [];
      Document.addGetter(scope,prop,true); // add array wrappers to mark dirty?
      Document.removeProperty(pkey,data,getters,setters);
    };

    Document.EmbedArray = function(data,schema,getters,setters,strict,scope,pkey){
      var s = object.clone(schema), g = object.clone(getters), s = object.clone(setters),
          Doc = function(obj,idx){
              var type = object.clone(s);
              var get= object.clone(g);
              var set = object.clone(s);
              Document.call(this,obj,schema,get,set,strict,scope,pkey,idx); 
          },
          pub = [],
          priv = scope.__doc[pkey] = [];

      Object.defineProperty(pub,'push',{enumerable: false, value: function(){
        var idx = pub.length,
            doc = new Doc(arguments[0],idx);
            Object.defineProperty(doc,'remove',{enumerable: false, value: function(){
              pub.splice(doc.__idx,1);
              priv.splice(doc.__idx,1);
              for(i=doc.__idx,l=pub.length; i<l; i++) pub[i].__idx--;
            }});
            priv[idx] = doc.__doc;
            pub[idx] = doc;
      }});

      scope.__defineGetter__(pkey,function(){ return pub; });

      if(isArray(data)){ 
        for(i=0,l=data.length; i < l; i++) pub.push(data[i]);
      }      
    };

    Document.addGetter = function(scope,field,getter,enum){
      object.addGetter(scope,field,function(){
        return (typeof getter == 'function') ? getter.call(scope, scope.__doc[field]) : scope.__doc[field];
      },enum);
    };

    Document.addSetter = function(scope,field,setter,enum){
      object.addSetter(scope,field,function(val){
        val = (object.type(val.__doc)) ? val.__doc : val;
        scope.__doc[field] = (typeof setter == 'function') ? setter.call(scope,val) : val;
        if(scope.__parent){
          scope.__parent.__dirty = true;
        }
        scope.__dirty = true;
      },enum);
    };

    Document.ensureField = function(scope,field,val){
      if(!scope[field]) 
        Object.defineProperty(scope,field,{value: val, writable: true, enumerable: false, configurable: true});
    };
    
    Document.removeProperty = function(field,data,getters,setters){
      // delete for faster custom data/getter/setter looping
      if(data && data[field]) delete data[field];
      if(getters && getters[field]) delete getters[field];
      if(setters && setters[field]) delete setters[field];
    };
    
// expose public API
this.Document = Document;