var Model = require('../../lib/model');


this.User = Model.Doc.extend({
  
  name : 'user',
  
  schema : {
    name : { type : String, validator : null, if_missing : ''},
    age :  { type : Number }
  },
  
  indexes : [['_id', 1], ['user', 1],['age', 1]]
  
});
