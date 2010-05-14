var Doc = require('../../mongoose/').Mongoose.connect('mongodb://localhost/test').use('docs');

new Doc({awesome:1, info:{type:'binary'}}).save();

Doc.find({awesome:1}).one(function(doc){
 doc.save('info.type','silly');
},true).then(function(){Doc.close();});