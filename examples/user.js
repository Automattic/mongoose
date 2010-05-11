var sys = require('sys'),
    Mongoose = require('../../mongoose/').Mongoose, db, User;
    
  //  Mongoose.load(__dirname+'/../lib/model/plugins/behaviors.js');
    Mongoose.load(__dirname+'/models/');
    db = Mongoose.connect('mongodb://localhost/test');
    
    User = db.static('User');
    
    User.drop();
    
    var objs = [],
      usernames = ['Nathan','Guillermo','Damian','Thianh','Rafael','Matt','Keeto'],
      lastnames = ['Corrales','Lu','Rauch','Walker','White','Suarez'],
      ages = [19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40];
    
    Array.prototype.random = function(){
      return this[Math.floor(Math.random()*this.length)];
    }
    
    
    for(i=0,l=1000; i < l; i++){
      objs.push({
        username : usernames.random(),
        first : usernames.random(),
        last : lastnames.random(),
        bio : {
          age : ages.random()
        }
      });
    }
    
    User.insert(objs).run(function(docs){
      // do something with docs that were inserted
    });
    
    hydrate = true;
    User.find({}).limit(20).gt({'bio.age' : 20}).lt({'bio.age' : 25}).each(function(doc){
      sys.puts(doc.first_last+' legal drinking age?: '+ doc.legalDrinkingAge);
  //    sys.puts(JSON.stringify(doc));
    },hydrate);
    
    Mongoose.close();
    
  //  setTimeout(function(){
  //    Mongoose.close();
  //  },500);
 //   Mongoose.close();