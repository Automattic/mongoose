
Array.prototype.extend = function(array){
  for (var j = array.length-1; j >= 0; j--) this.unshift(array[j]);
  return this;
};

Function.prototype.bind = function(bind,args){
  var self = this;
  var options = args;
  return function(){
    var args = (options != undefined) ? options.extend(arguments) : arguments;
    return (function(){
      return self.apply(bind || null, args);
    })();
  }
};