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