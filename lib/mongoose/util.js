var object = this.object = {
  
  mixin: function(){
    // copy reference to target object
    var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, source;

    // Handle a deep copy situation
    if ( typeof target === "boolean" ) {
      deep = target;
      target = arguments[1] || {};
      // skip the boolean and the target
      i = 2;
    }

    // Handle case when target is a string or something (possible in deep copy)
    if ( typeof target !== "object" && !(typeof target === 'function') )
      target = {};

    // mixin process itself if only one argument is passed
    if ( length == i ) {
      target = GLOBAL;
      --i;
    }

    for ( ; i < length; i++ ) {
      // Only deal with non-null/undefined values
      if ( (source = arguments[i]) != null ) {
        // Extend the base object
        Object.getOwnPropertyNames(source).forEach(function(k){
          var d = Object.getOwnPropertyDescriptor(source, k) || {value: source[k]};
          if (d.get) {
            target.__defineGetter__(k, d.get);
            if (d.set) {
              target.__defineSetter__(k, d.set);
            }
          }
          else {
            // Prevent never-ending loop
            if (target === d.value) {
              continue;
            }

            if (deep && d.value && typeof d.value === "object") {
              target[k] = object.mixin(deep,
                // Never move original objects, clone them
                source[k] || (d.value.length != null ? [] : {})
              , d.value);
            }
            else {
              target[k] = d.value;
            }
          }
        });
      }
    }
    // Return the modified object
    return target;
  }
  
},

_define = function(proto, key, value){
  Object.defineProperty(proto, key, {value: value, enumerable: false});
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
  
  Class.extend = function(props) {
    var __super__ = this.prototype, __superself__ = this
    
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
          Class[key] = props[key]
    }
    
    Class.include = function(props) {
      for (var name in props)
        if (name == 'include')
          if (props[name] instanceof Array)
            for (var i = 0, len = props[name].length; i < len; ++i)
              Class.include(props[name][i])
          else
            Class.include(props[name])
        else if (name == 'extend'){
          if (__superself__){
            var older = {};
            for (var i in __superself__){
              if (!(i in SuperClass) && !(i in Class)){
                older[i] = __superself__[i];
              }
            }
            props[name] = [].concat(older).concat(props[name])
          }
          if (props[name] instanceof Array)
            for (var i = 0, len = props[name].length; i < len; ++i)
              extend(props[name][i])
          else
            extend(props[name])
        } else if (props.hasOwnProperty(name))
          _define(prototype,name,
            typeof props[name] == 'function' &&
            typeof __super__[name] == 'function' &&
            referencesSuper.test(props[name]) ?
              (function(name, fn){
                return function() {
                  this.__super__ = __super__[name]
                  return fn.apply(this, arguments)
                }
              })(name, props[name])
            : props[name]           
          );
    }
    
    Class.include(props)
    Class.prototype = prototype
    Class.constructor = Class
    Class.extend = arguments.callee
    
    return Class
  }
  
  return Class;
})();