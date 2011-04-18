
/**
 * Module dependencies.
 */

var start = require('./common')
  , should = require('should')
  , mongoose = require('./common').mongoose
  , Schema = mongoose.Schema
  , MongooseArray = mongoose.Types.Array;

var User = new Schema({
    name: String
  , pets: [Schema.ObjectId]
});

mongoose.model('User', User);

var Pet = new Schema({
  name: String
});

mongoose.model('Pet', Pet);

/**
 * Test.
 */

module.exports = {

  'test that a mongoose array behaves and quacks like an array': function(){
    var a = new MongooseArray;

    a.should.be.an.instanceof(Array);
    a.should.be.an.instanceof(MongooseArray);
    Array.isArray(a).should.be.true;
    (a._atomics.constructor).should.eql(Object);
  },
  
  'test indexOf()': function(){
    var db = start()
      , a = new MongooseArray
      , User = db.model('User')
      , Pet = db.model('Pet');

    var tj = new User({ name: 'tj' })
      , tobi = new Pet({ name: 'tobi' })
      , loki = new Pet({ name: 'loki' })
      , jane = new Pet({ name: 'jane' });

    tj.pets.push(tobi);
    tj.pets.push(loki);
    tj.pets.push(jane);

    tj.save(function(err){
      User.findOne({ name: 'tj' }, function(err, user){
        should.equal(null, err, 'error in callback');
        user.pets.should.have.length(3);
        user.pets.indexOf(tobi.id).should.equal(0);
        user.pets.indexOf(loki.id).should.equal(1);
        user.pets.indexOf(jane.id).should.equal(2);
        db.close();
      });
    });
  }
};
