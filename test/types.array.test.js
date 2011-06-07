
/**
 * Module dependencies.
 */

var start = require('./common')
  , should = require('should')
  , mongoose = require('./common').mongoose
  , Schema = mongoose.Schema
  , random = require('mongoose/utils').random
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
      , User = db.model('User', 'users_' + random())
      , Pet = db.model('Pet', 'pets' + random());

    var tj = new User({ name: 'tj' })
      , tobi = new Pet({ name: 'tobi' })
      , loki = new Pet({ name: 'loki' })
      , jane = new Pet({ name: 'jane' })
      , pets = [];

    tj.pets.push(tobi);
    tj.pets.push(loki);
    tj.pets.push(jane);

    var pending = 3;

    [tobi, loki, jane].forEach(function(pet){
      pet.save(function(){
        --pending || done();
      });
    });

    function done() {
      Pet.find({}, function(err, pets){
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
      });
    }
  },

  'test #splice()': function () {
    var collection = 'splicetest' + random();
    var db = start()
      , schema = new Schema({ numbers: Array })
      , A = db.model('splicetest', schema, collection);

    var a = new A({ numbers: [4,5,6,7] });
    a.save(function (err) {
      should.equal(null, err, 'could not save splice test');
      A.findById(a._id, function (err, doc) {
        should.equal(null, err, 'error finding splice doc');
        doc.numbers.splice(1, 1);
        doc.numbers.toObject().should.eql([4,6,7]);
        doc.save(function (err) {
          should.equal(null, err, 'could not save splice test');
          A.findById(a._id, function (err, doc) {
            should.equal(null, err, 'error finding splice doc');
            doc.numbers.toObject().should.eql([4,6,7]);

            A.collection.drop(function (err) {
              db.close();
              should.strictEqual(err, null);
            });
          });
        });
      });
    });
  }
};
