var object = this.object = {
  
  mergeDeep: function(a, b) {
    if (!b) return a
    var target = a,
        keys = Object.keys(b)
    for (var i = 0, len = keys.length; i < len; ++i){
      var key = keys[i]
      if (typeof b[key] === 'object')
        target = object.mergeDeep((target[key] = target[key] || {}), b[key])
      else
        target[key] = b[key]
    }
    return a
  }
  
};

// OO - Class - Copyright TJ Holowaychuk <tj@vision-media.ca> (MIT Licensed)
// Based on http://ejohn.org/blog/simple-javascript-inheritance/
// which is based on implementations by Prototype / base2

exports.Class = (function(){
  var global = this, initialize = true
  var referencesSuper = /xyz/.test(function(){ xyz }) ? /\b__super__\b/ : /.*/

  /**
   * Shortcut for Class.extend()
   *
   * @param  {hash} props
   * @return {function}
   * @api public
   */

  var Class = function(props){
    if (this == global)
      return Class.extend(props)  
  },
  
  SuperClass = Class;
  
  // --- Version
  
  Class.version = '1.2.0'
  
  /**
   * Create a new class.
   *
   *   User = Class({
   *     init: function(name){
   *       this.name = name
   *     }
   *   })
   *
   * Classes may be subclassed using the .extend() method, and
   * the associated superclass method via this.__super__().
   *
   *   Admin = User.extend({
   *     init: function(name, password) {
   *       this.__super__(name)
   *       // or this.__super__.apply(this, arguments)
   *       this.password = password
   *     }
   *   })
   *
   * @param  {hash} props
   * @return {function}
   * @api public
   */
  
   Object.defineProperty(Class,'extend',{
     value: function(props) {
       var __super__ = this.prototype

       initialize = false
       var prototype = new this
       initialize = true

       function Class() {
         if (initialize && this.init)
           this.init.apply(this, arguments)
       }

       function extend(props) {
         for (var key in props)
           if (props.hasOwnProperty(key))
             Object.defineProperty(Class,key,{value: props[key], enumerable: false});
        //     Class[key] = props[key]
       }

       Object.defineProperty(Class,'include',{
         value: function(props) {
           for (var name in props)
             if (name == 'include')
               if (props[name] instanceof Array)
                 for (var i = 0, len = props[name].length; i < len; ++i)
                   Class.include(props[name][i])
               else
                 Class.include(props[name])
             else if (name == 'extend')
               if (props[name] instanceof Array)
                 for (var i = 0, len = props[name].length; i < len; ++i)
                   extend(props[name][i])
               else
                 extend(props[name])
             else if (props.hasOwnProperty(name))
               Object.defineProperty(prototype,name,{
                 value: 
                   typeof props[name] == 'function' &&
                   typeof __super__[name] == 'function' &&
                   referencesSuper.test(prop[name]) ?
                     (function(name,fn){
                       return function(){
                         this.__super__ = __super__[name];
                         return fn.apply(this, arguments);
                       }
                     })(name, props[name])
                   : props[name],
                 enumerable: false
               });
         },
         enumerable: false
       });

       Object.defineProperty(Class,'static',{
         value: function(props){
          for(var name in props)
           if(props.hasOwnProperty(name))
             if(Class.hasOwnProperty(name))
               Class[name] = props[name];
             else Object.defineProperty(Class,name,{
               value: props[name],
               enumerable: false
             });
         },
         enumerable: false
       });

       Class.include(props)
       Class.prototype = prototype
       Object.defineProperty(Class,'constructor',{value: Class, enumerable: false});
       Object.defineProperty(Class,'extend',{value: arguments.callee, enumerable: false});

       return Class
     },
     enumerable: false
   });
  
  return Class;
})();