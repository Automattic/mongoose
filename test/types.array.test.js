
/**
 * Module dependencies.
 */

var start = require('./common')
  , should = require('should')
  , mongoose = require('./common').mongoose
  , Schema = mongoose.Schema
  , random = require('../lib/utils').random
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

    ;[tobi, loki, jane].forEach(function(pet){
      pet.save(function(){
        --pending || done();
      });
    });

    function done() {
      Pet.find({}, function(err, pets){
        tj.save(function(err){
          User.findOne({ name: 'tj' }, function(err, user){
            db.close();
            should.equal(null, err, 'error in callback');
            user.pets.should.have.length(3);
            user.pets.indexOf(tobi.id).should.equal(0);
            user.pets.indexOf(loki.id).should.equal(1);
            user.pets.indexOf(jane.id).should.equal(2);
            user.pets.indexOf(tobi._id).should.equal(0);
            user.pets.indexOf(loki._id).should.equal(1);
            user.pets.indexOf(jane._id).should.equal(2);
          });
        });
      });
    }
  },
  'test #splice() with numbers': function () {
    var collection = 'splicetest-number' + random();
    var db = start()
      , schema = new Schema({ numbers: Array })
      , A = db.model('splicetestNumber', schema, collection);

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
  },

  'test #splice() on embedded docs': function () {
    var collection = 'splicetest-embeddeddocs' + random();
    var db = start()
      , schema = new Schema({ types: [new Schema({ type: String }) ]})
      , A = db.model('splicetestEmbeddedDoc', schema, collection);

    var a = new A({ types: [{type:'bird'},{type:'boy'},{type:'frog'},{type:'cloud'}] });
    a.save(function (err) {
      should.equal(null, err, 'could not save splice test');
      A.findById(a._id, function (err, doc) {
        should.equal(null, err, 'error finding splice doc');

        doc.types.splice(1, 1);

        var obj = doc.types.toObject();
        obj[0].type.should.eql('bird');
        obj[1].type.should.eql('frog');
        obj[2].type.should.eql('cloud');

        doc.save(function (err) {
          should.equal(null, err, 'could not save splice test');
          A.findById(a._id, function (err, doc) {
            should.equal(null, err, 'error finding splice doc');

            var obj = doc.types.toObject();
            obj[0].type.should.eql('bird');
            obj[1].type.should.eql('frog');
            obj[2].type.should.eql('cloud');

            A.collection.drop(function (err) {
              db.close();
              should.strictEqual(err, null);
            });
          });
        });
      });
    });
  },

  '#unshift': function () {
    var db = start()
      , schema = new Schema({
            types: [new Schema({ type: String })]
          , nums: [Number]
          , strs: [String]
        })
      , A = db.model('unshift', schema, 'unshift'+random());

    var a = new A({
        types: [{type:'bird'},{type:'boy'},{type:'frog'},{type:'cloud'}]
      , nums: [1,2,3]
      , strs: 'one two three'.split(' ')
    });

    a.save(function (err) {
      should.equal(null, err);
      A.findById(a._id, function (err, doc) {
        should.equal(null, err);

        var tlen = doc.types.unshift({type:'tree'});
        var nlen = doc.nums.unshift(0);
        var slen = doc.strs.unshift('zero');

        tlen.should.equal(5);
        nlen.should.equal(4);
        slen.should.equal(4);

        var obj = doc.types.toObject();
        obj[0].type.should.eql('tree');
        obj[1].type.should.eql('bird');
        obj[2].type.should.eql('boy');
        obj[3].type.should.eql('frog');
        obj[4].type.should.eql('cloud');

        obj = doc.nums.toObject();
        obj[0].valueOf().should.equal(0);
        obj[1].valueOf().should.equal(1);
        obj[2].valueOf().should.equal(2);
        obj[3].valueOf().should.equal(3);

        obj = doc.strs.toObject();
        obj[0].should.equal('zero');
        obj[1].should.equal('one');
        obj[2].should.equal('two');
        obj[3].should.equal('three');

        doc.save(function (err) {
          should.equal(null, err);
          A.findById(a._id, function (err, doc) {
            should.equal(null, err);

            var obj = doc.types.toObject();
            obj[0].type.should.eql('tree');
            obj[1].type.should.eql('bird');
            obj[2].type.should.eql('boy');
            obj[3].type.should.eql('frog');
            obj[4].type.should.eql('cloud');

            obj = doc.nums.toObject();
            obj[0].valueOf().should.equal(0);
            obj[1].valueOf().should.equal(1);
            obj[2].valueOf().should.equal(2);
            obj[3].valueOf().should.equal(3);

            obj = doc.strs.toObject();
            obj[0].should.equal('zero');
            obj[1].should.equal('one');
            obj[2].should.equal('two');
            obj[3].should.equal('three');

            A.collection.drop(function (err) {
              db.close();
              should.strictEqual(err, null);
            });
          });
        });
      });
    });
  },

  '#addToSet': function () {
    var db = start()
      , e = new Schema({ name: String, arr: [] })
      , schema = new Schema({
          num: [Number]
        , str: [String]
        , doc: [e]
        , date: [Date]
        , id:  [Schema.ObjectId]
      });

    var M = db.model('testAddToSet', schema);
    var m = new M;

    m.num.push(1,2,3);
    m.str.push('one','two','tres');
    m.doc.push({ name: 'Dubstep', arr: [1] }, { name: 'Polka', arr: [{ x: 3 }]});

    var d1 = new Date;
    var d2 = new Date( +d1 + 60000);
    var d3 = new Date( +d1 + 30000);
    var d4 = new Date( +d1 + 20000);
    var d5 = new Date( +d1 + 90000);
    var d6 = new Date( +d1 + 10000);
    m.date.push(d1, d2);

    var id1 = new mongoose.Types.ObjectId;
    var id2 = new mongoose.Types.ObjectId;
    var id3 = new mongoose.Types.ObjectId;
    var id4 = new mongoose.Types.ObjectId;
    var id5 = new mongoose.Types.ObjectId;
    var id6 = new mongoose.Types.ObjectId;

    m.id.push(id1, id2);

    m.num.addToSet(3,4,5);
    m.num.length.should.equal(5);
    m.str.$addToSet('four', 'five', 'two');
    m.str.length.should.equal(5);
    m.id.addToSet(id2, id3);
    m.id.length.should.equal(3);
    m.doc.$addToSet(m.doc[0]);
    m.doc.length.should.equal(2);
    m.doc.$addToSet({ name: 'Waltz', arr: [1] }, m.doc[0]);
    m.doc.length.should.equal(3);
    m.date.length.should.equal(2);
    m.date.$addToSet(d1);
    m.date.length.should.equal(2);
    m.date.addToSet(d3);
    m.date.length.should.equal(3);

    m.save(function (err) {
      should.strictEqual(null, err);
      M.findById(m, function (err, m) {
        should.strictEqual(null, err);

        m.num.length.should.equal(5);
        (~m.num.indexOf(1)).should.be.ok;
        (~m.num.indexOf(2)).should.be.ok;
        (~m.num.indexOf(3)).should.be.ok;
        (~m.num.indexOf(4)).should.be.ok;
        (~m.num.indexOf(5)).should.be.ok;

        m.str.length.should.equal(5);
        (~m.str.indexOf('one')).should.be.ok;
        (~m.str.indexOf('two')).should.be.ok;
        (~m.str.indexOf('tres')).should.be.ok;
        (~m.str.indexOf('four')).should.be.ok;
        (~m.str.indexOf('five')).should.be.ok;

        m.id.length.should.equal(3);
        (~m.id.indexOf(id1)).should.be.ok;
        (~m.id.indexOf(id2)).should.be.ok;
        (~m.id.indexOf(id3)).should.be.ok;

        m.date.length.should.equal(3);
        (~m.date.indexOf(d1.toString())).should.be.ok;
        (~m.date.indexOf(d2.toString())).should.be.ok;
        (~m.date.indexOf(d3.toString())).should.be.ok;

        m.doc.length.should.equal(3);
        m.doc.some(function(v){return v.name === 'Waltz'}).should.be.ok
        m.doc.some(function(v){return v.name === 'Dubstep'}).should.be.ok
        m.doc.some(function(v){return v.name === 'Polka'}).should.be.ok

        // test single $addToSet
        m.num.addToSet(3,4,5,6);
        m.num.length.should.equal(6);
        m.str.$addToSet('four', 'five', 'two', 'six');
        m.str.length.should.equal(6);
        m.id.addToSet(id2, id3, id4);
        m.id.length.should.equal(4);

        m.date.$addToSet(d1, d3, d4);
        m.date.length.should.equal(4);

        m.doc.$addToSet(m.doc[0], { name: '8bit' });
        m.doc.length.should.equal(4);

        m.save(function (err) {
          should.strictEqual(null, err);

          M.findById(m, function (err, m) {
            should.strictEqual(null, err);

            m.num.length.should.equal(6);
            (~m.num.indexOf(1)).should.be.ok;
            (~m.num.indexOf(2)).should.be.ok;
            (~m.num.indexOf(3)).should.be.ok;
            (~m.num.indexOf(4)).should.be.ok;
            (~m.num.indexOf(5)).should.be.ok;
            (~m.num.indexOf(6)).should.be.ok;

            m.str.length.should.equal(6);
            (~m.str.indexOf('one')).should.be.ok;
            (~m.str.indexOf('two')).should.be.ok;
            (~m.str.indexOf('tres')).should.be.ok;
            (~m.str.indexOf('four')).should.be.ok;
            (~m.str.indexOf('five')).should.be.ok;
            (~m.str.indexOf('six')).should.be.ok;

            m.id.length.should.equal(4);
            (~m.id.indexOf(id1)).should.be.ok;
            (~m.id.indexOf(id2)).should.be.ok;
            (~m.id.indexOf(id3)).should.be.ok;
            (~m.id.indexOf(id4)).should.be.ok;

            m.date.length.should.equal(4);
            (~m.date.indexOf(d1.toString())).should.be.ok;
            (~m.date.indexOf(d2.toString())).should.be.ok;
            (~m.date.indexOf(d3.toString())).should.be.ok;
            (~m.date.indexOf(d4.toString())).should.be.ok;

            m.doc.length.should.equal(4);
            m.doc.some(function(v){return v.name === 'Waltz'}).should.be.ok
            m.doc.some(function(v){return v.name === 'Dubstep'}).should.be.ok
            m.doc.some(function(v){return v.name === 'Polka'}).should.be.ok
            m.doc.some(function(v){return v.name === '8bit'}).should.be.ok

            // test multiple $addToSet
            m.num.addToSet(7,8);
            m.num.length.should.equal(8);
            m.str.$addToSet('seven', 'eight');
            m.str.length.should.equal(8);
            m.id.addToSet(id5, id6);
            m.id.length.should.equal(6);

            m.date.$addToSet(d5, d6);
            m.date.length.should.equal(6);

            m.doc.$addToSet(m.doc[1], { name: 'BigBeat' }, { name: 'Funk' });
            m.doc.length.should.equal(6);

            m.save(function (err) {
              should.strictEqual(null, err);

              M.findById(m, function (err, m) {
                db.close();
                should.strictEqual(null, err);

                m.num.length.should.equal(8);
                (~m.num.indexOf(1)).should.be.ok;
                (~m.num.indexOf(2)).should.be.ok;
                (~m.num.indexOf(3)).should.be.ok;
                (~m.num.indexOf(4)).should.be.ok;
                (~m.num.indexOf(5)).should.be.ok;
                (~m.num.indexOf(6)).should.be.ok;
                (~m.num.indexOf(7)).should.be.ok;
                (~m.num.indexOf(8)).should.be.ok;

                m.str.length.should.equal(8);
                (~m.str.indexOf('one')).should.be.ok;
                (~m.str.indexOf('two')).should.be.ok;
                (~m.str.indexOf('tres')).should.be.ok;
                (~m.str.indexOf('four')).should.be.ok;
                (~m.str.indexOf('five')).should.be.ok;
                (~m.str.indexOf('six')).should.be.ok;
                (~m.str.indexOf('seven')).should.be.ok;
                (~m.str.indexOf('eight')).should.be.ok;

                m.id.length.should.equal(6);
                (~m.id.indexOf(id1)).should.be.ok;
                (~m.id.indexOf(id2)).should.be.ok;
                (~m.id.indexOf(id3)).should.be.ok;
                (~m.id.indexOf(id4)).should.be.ok;
                (~m.id.indexOf(id5)).should.be.ok;
                (~m.id.indexOf(id6)).should.be.ok;

                m.date.length.should.equal(6);
                (~m.date.indexOf(d1.toString())).should.be.ok;
                (~m.date.indexOf(d2.toString())).should.be.ok;
                (~m.date.indexOf(d3.toString())).should.be.ok;
                (~m.date.indexOf(d4.toString())).should.be.ok;
                (~m.date.indexOf(d5.toString())).should.be.ok;
                (~m.date.indexOf(d6.toString())).should.be.ok;

                m.doc.length.should.equal(6);
                m.doc.some(function(v){return v.name === 'Waltz'}).should.be.ok
                m.doc.some(function(v){return v.name === 'Dubstep'}).should.be.ok
                m.doc.some(function(v){return v.name === 'Polka'}).should.be.ok
                m.doc.some(function(v){return v.name === '8bit'}).should.be.ok
                m.doc.some(function(v){return v.name === 'BigBeat'}).should.be.ok
                m.doc.some(function(v){return v.name === 'Funk'}).should.be.ok
              });
            });
          });
        });
      });
    });
  }
};
