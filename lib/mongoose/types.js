var mongoose = module.parent.exports,
    type = mongoose.type;

type('string')
  .get(function(val,key){
    return val+'';
  })
  .set(function(val,key){
    return val+'';
  });