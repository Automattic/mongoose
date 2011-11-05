var o = {
    $pull: { comments: { _id: 49, title: 'go there' }}
  , $set: { thing: 'something else' }
  , $inc: { 'some.$.positional.$.path': ['wooooot'] }
  , $addToSet: { stuff: { $each: [ 3,4,5] } }
  , $unset: 'fail'
  , iamaset: 2222
}

///
// { 'comments._id': 49
// , 'comments.title: 'go there'
// , 'thing': 'something else'
// , 'some$.positional.$.path': ['wwwoooott']
// }

// this is the update object
function parse (obj) {
  var ops = Object.keys(obj)
    , i = ops.length

  // fix up $set sugar
  while (i--) {
    var op = ops[i];
    if ('$' !== op[0]) {
      obj.$set || (obj.$set = {});
      obj.$set[op] = obj[op];
      delete obj[op];
      ops.splice(i, 1);
    }
  }

  i = ops.length;

  while (i--) {
    var op = ops[i];
    walk(obj[op]);
    //console.error( walk(obj[op]) );
  }
  console.error('after', obj);
}

// this is the path object
function walk (obj, pref) {

  var prefix = pref
    ? pref + '.'
    : ''

  var keys = Object.keys(obj)
    , i = keys.length
    , key
    , val

  while (i--) {
    key = keys[i];
    val = obj[key];
    if (val && 'Object' === val.constructor.name) {
      walk(val, prefix + key);
    } else {
      // here we look up the schema with our fancy methods
      // schema.path(prefix + key)
      if ('$each' === key) {
        console.error('"'+pref+'"', val);
      } else {
        console.error('"'+prefix+key+'"', val);
      }
      // now set the value back after casting from the schema
      obj[key] = "new casted value";
    }
  }

}

console.error(o);
parse(o);
