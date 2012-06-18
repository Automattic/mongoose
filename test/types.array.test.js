
/**
 * Module dependencies.
 */

var start = require('./common')
  , assert = require('assert')
  , mongoose = require('./common').mongoose
  , Schema = mongoose.Schema
  , random = require('../lib/utils').random
  , MongooseArray = mongoose.Types.Array
  , collection = 'avengers_'+random()

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

describe('types array', function(){
  it('behaves and quacks like an Array', function(){
    var a = new MongooseArray;

    assert.ok(a instanceof Array);
    assert.ok(a instanceof MongooseArray);
    assert.equal(true, Array.isArray(a));
    assert.deepEqual(a._atomics.constructor, Object);
  });

  describe('doAtomics', function(){
    it('does not throw', function(){
      var b = new MongooseArray([12,3,4,5]).filter(Boolean);
      var threw = false;

      try {
        b.doAtomics
      } catch (_) {
        threw = true;
      }

      assert.ok(!threw);

      var a = new MongooseArray([67,8]).filter(Boolean);
      try {
        a.push(3,4);
      } catch (_) {
        console.error(_);
        threw = true;
      }

      assert.ok(!threw);
    });

  })

  it('$push exists', function() {
    var db = start()
    var User = db.model('User')
    var tj = new User({ name: 'tj',  pets: []})
    db.close()
    assert.equal('function', typeof tj.pets.$push)
  })

  it('$pop exists', function() {
    var db = start()
    var User = db.model('User')
    var tj = new User({ name: 'tj',  pets: []})
    db.close()
    assert.equal('function', typeof tj.pets.$pop)
  })

  it('$shift is shift', function() {
    var db = start()
    var User = db.model('User')
    var tj = new User({ name: 'tj',  pets: []})
    assert.equal(tj.pets.shift, tj.pets.$shift)
    db.close()
  })

  it('$unshift is unshift', function() {
    var db = start()
    var User = db.model('User')
    var tj = new User({ name: 'tj',  pets: []})
    db.close()
    assert.equal('function', typeof tj.pets.$unshift)
  })

  describe('indexOf()', function(){
    it('works', function(done){
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
          --pending || cb();
        });
      });

      function cb() {
        Pet.find({}, function(err, pets){
          assert.ifError(err);
          tj.save(function(err){
            assert.ifError(err);
            User.findOne({ name: 'tj' }, function(err, user){
              db.close();
              assert.ifError(err);
              assert.equal(user.pets.length, 3);
              assert.equal(user.pets.indexOf(tobi.id),0);
              assert.equal(user.pets.indexOf(loki.id),1);
              assert.equal(user.pets.indexOf(jane.id),2);
              assert.equal(user.pets.indexOf(tobi._id),0);
              assert.equal(user.pets.indexOf(loki._id),1);
              assert.equal(user.pets.indexOf(jane._id),2);
              done();
            });
          });
        });
      }
        
    })
  })

  describe('splice()', function(){
    it('works', function(done){
      var collection = 'splicetest-number' + random();
      var db = start()
        , schema = new Schema({ numbers: Array })
        , A = db.model('splicetestNumber', schema, collection);

      var a = new A({ numbers: [4,5,6,7] });
      a.save(function (err) {
        assert.ifError(err);
        A.findById(a._id, function (err, doc) {
          assert.ifError(err);
          var removed = doc.numbers.splice(1, 1);
          assert.deepEqual(removed, [5]);
          assert.deepEqual(doc.numbers.toObject(),[4,6,7]);
          doc.save(function (err) {
            assert.ifError(err);
            A.findById(a._id, function (err, doc) {
              assert.ifError(err);
              assert.deepEqual(doc.numbers.toObject(), [4,6,7]);

              A.collection.drop(function (err) {
                db.close();
                assert.ifError(err);
                done();
              });
            });
          });
        });
      });
    })

    it('on embedded docs', function(done){
      var collection = 'splicetest-embeddeddocs' + random();
      var db = start()
        , schema = new Schema({ types: [new Schema({ type: String }) ]})
        , A = db.model('splicetestEmbeddedDoc', schema, collection);

      var a = new A({ types: [{type:'bird'},{type:'boy'},{type:'frog'},{type:'cloud'}] });
      a.save(function (err) {
        assert.ifError(err);
        A.findById(a._id, function (err, doc) {
          assert.ifError(err);

          var removed = doc.types.splice(1, 1);
          assert.equal(removed.length,1);
          assert.equal(removed[0].type,'boy');

          var obj = doc.types.toObject();
          assert.equal(obj[0].type,'bird');
          assert.equal(obj[1].type,'frog');
          assert.equal(obj[2].type,'cloud');

          doc.save(function (err) {
            assert.ifError(err);
            A.findById(a._id, function (err, doc) {
              db.close();
              assert.ifError(err);

              var obj = doc.types.toObject();
              assert.equal(obj[0].type,'bird');
              assert.equal(obj[1].type,'frog');
              assert.equal(obj[2].type,'cloud');
              done();
            });
          });
        });
      });
    });
  })

  describe('unshift()', function(){
    it('works', function(done){
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
        assert.ifError(err);
        A.findById(a._id, function (err, doc) {
          assert.ifError(err);

          var tlen = doc.types.unshift({type:'tree'});
          var nlen = doc.nums.unshift(0);
          var slen = doc.strs.unshift('zero');

          assert.equal(tlen,5);
          assert.equal(nlen,4);
          assert.equal(slen,4);

          var obj = doc.types.toObject();
          assert.equal(obj[0].type,'tree');
          assert.equal(obj[1].type,'bird');
          assert.equal(obj[2].type,'boy');
          assert.equal(obj[3].type,'frog');
          assert.equal(obj[4].type,'cloud');

          obj = doc.nums.toObject();
          assert.equal(obj[0].valueOf(),0);
          assert.equal(obj[1].valueOf(),1);
          assert.equal(obj[2].valueOf(),2);
          assert.equal(obj[3].valueOf(),3);

          obj = doc.strs.toObject();
          assert.equal(obj[0],'zero');
          assert.equal(obj[1],'one');
          assert.equal(obj[2],'two');
          assert.equal(obj[3],'three');

          doc.save(function (err) {
            assert.ifError(err);
            A.findById(a._id, function (err, doc) {
              db.close();
              assert.ifError(err);

              var obj = doc.types.toObject();
              assert.equal(obj[0].type,'tree');
              assert.equal(obj[1].type,'bird');
              assert.equal(obj[2].type,'boy');
              assert.equal(obj[3].type,'frog');
              assert.equal(obj[4].type,'cloud');

              obj = doc.nums.toObject();
              assert.equal(obj[0].valueOf(),0);
              assert.equal(obj[1].valueOf(),1);
              assert.equal(obj[2].valueOf(),2);
              assert.equal(obj[3].valueOf(),3);

              obj = doc.strs.toObject();
              assert.equal(obj[0],'zero');
              assert.equal(obj[1],'one');
              assert.equal(obj[2],'two');
              assert.equal(obj[3],'three');
              done();
            });
          });
        });
      });
    })
  });

  describe('pull()', function(){
    it('works', function(done){
      var db= start();
      var catschema = new Schema({ name: String })
      var Cat = db.model('Cat', catschema);
      var schema = new Schema({
          a: [{ type: Schema.ObjectId, ref: 'Cat' }]
      });
      var A = db.model('TestPull', schema);
      var cat  = new Cat({ name: 'peanut' });
      cat.save(function (err) {
        assert.ifError(err);

        var a = new A({ a: [cat._id] });
        a.save(function (err) {
          assert.ifError(err);

          A.findById(a, function (err, doc) {
            db.close();
            assert.ifError(err);
            assert.equal(1, doc.a.length);
            doc.a.pull(cat.id);
            assert.equal(doc.a.length,0);
            done();
          });
        });
      });
    });
  })

  describe('addToSet()', function(){
    it('works', function(done){
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
      assert.equal(5, m.num.length);
      m.str.addToSet('four', 'five', 'two');
      assert.equal(m.str.length,5);
      m.id.addToSet(id2, id3);
      assert.equal(m.id.length,3);
      m.doc.addToSet(m.doc[0]);
      assert.equal(m.doc.length,2);
      m.doc.addToSet({ name: 'Waltz', arr: [1] }, m.doc[0]);
      assert.equal(m.doc.length,3);
      assert.equal(m.date.length,2);
      m.date.addToSet(d1);
      assert.equal(m.date.length,2);
      m.date.addToSet(d3);
      assert.equal(m.date.length,3);

      m.save(function (err) {
        assert.ifError(err);
        M.findById(m, function (err, m) {
          assert.ifError(err);

          assert.equal(m.num.length,5);
          assert.ok(~m.num.indexOf(1));
          assert.ok(~m.num.indexOf(2));
          assert.ok(~m.num.indexOf(3));
          assert.ok(~m.num.indexOf(4));
          assert.ok(~m.num.indexOf(5));

          assert.equal(m.str.length,5);
          assert.ok(~m.str.indexOf('one'));
          assert.ok(~m.str.indexOf('two'));
          assert.ok(~m.str.indexOf('tres'));
          assert.ok(~m.str.indexOf('four'));
          assert.ok(~m.str.indexOf('five'));

          assert.equal(m.id.length,3);
          assert.ok(~m.id.indexOf(id1));
          assert.ok(~m.id.indexOf(id2));
          assert.ok(~m.id.indexOf(id3));

          assert.equal(m.date.length,3);
          assert.ok(~m.date.indexOf(d1.toString()));
          assert.ok(~m.date.indexOf(d2.toString()));
          assert.ok(~m.date.indexOf(d3.toString()));

          assert.equal(m.doc.length,3);
          assert.ok(m.doc.some(function(v){return v.name === 'Waltz'}))
          assert.ok(m.doc.some(function(v){return v.name === 'Dubstep'}))
          assert.ok(m.doc.some(function(v){return v.name === 'Polka'}))

          // test single $addToSet
          m.num.addToSet(3,4,5,6);
          assert.equal(m.num.length,6);
          m.str.addToSet('four', 'five', 'two', 'six');
          assert.equal(m.str.length,6);
          m.id.addToSet(id2, id3, id4);
          assert.equal(m.id.length,4);

          m.date.addToSet(d1, d3, d4);
          assert.equal(m.date.length,4);

          m.doc.addToSet(m.doc[0], { name: '8bit' });
          assert.equal(m.doc.length,4);

          m.save(function (err) {
            assert.ifError(err);

            M.findById(m, function (err, m) {
              assert.ifError(err);

              assert.equal(m.num.length,6);
              assert.ok(~m.num.indexOf(1));
              assert.ok(~m.num.indexOf(2));
              assert.ok(~m.num.indexOf(3));
              assert.ok(~m.num.indexOf(4));
              assert.ok(~m.num.indexOf(5));
              assert.ok(~m.num.indexOf(6));

              assert.equal(m.str.length,6);
              assert.ok(~m.str.indexOf('one'));
              assert.ok(~m.str.indexOf('two'));
              assert.ok(~m.str.indexOf('tres'));
              assert.ok(~m.str.indexOf('four'));
              assert.ok(~m.str.indexOf('five'));
              assert.ok(~m.str.indexOf('six'));

              assert.equal(m.id.length,4);
              assert.ok(~m.id.indexOf(id1));
              assert.ok(~m.id.indexOf(id2));
              assert.ok(~m.id.indexOf(id3));
              assert.ok(~m.id.indexOf(id4));

              assert.equal(m.date.length,4);
              assert.ok(~m.date.indexOf(d1.toString()));
              assert.ok(~m.date.indexOf(d2.toString()));
              assert.ok(~m.date.indexOf(d3.toString()));
              assert.ok(~m.date.indexOf(d4.toString()));

              assert.equal(m.doc.length,4);
              assert.ok(m.doc.some(function(v){return v.name === 'Waltz'}));
              assert.ok(m.doc.some(function(v){return v.name === 'Dubstep'}));
              assert.ok(m.doc.some(function(v){return v.name === 'Polka'}));
              assert.ok(m.doc.some(function(v){return v.name === '8bit'}));

              // test multiple $addToSet
              m.num.addToSet(7,8);
              assert.equal(m.num.length,8);
              m.str.addToSet('seven', 'eight');
              assert.equal(m.str.length,8);
              m.id.addToSet(id5, id6);
              assert.equal(m.id.length,6);

              m.date.addToSet(d5, d6);
              assert.equal(m.date.length,6);

              m.doc.addToSet(m.doc[1], { name: 'BigBeat' }, { name: 'Funk' });
              assert.equal(m.doc.length,6);

              m.save(function (err) {
                assert.ifError(err);

                M.findById(m, function (err, m) {
                  db.close();
                  assert.ifError(err);

                  assert.equal(m.num.length,8);
                  assert.ok(~m.num.indexOf(1));
                  assert.ok(~m.num.indexOf(2));
                  assert.ok(~m.num.indexOf(3));
                  assert.ok(~m.num.indexOf(4));
                  assert.ok(~m.num.indexOf(5));
                  assert.ok(~m.num.indexOf(6));
                  assert.ok(~m.num.indexOf(7));
                  assert.ok(~m.num.indexOf(8));

                  assert.equal(m.str.length,8);
                  assert.ok(~m.str.indexOf('one'));
                  assert.ok(~m.str.indexOf('two'));
                  assert.ok(~m.str.indexOf('tres'));
                  assert.ok(~m.str.indexOf('four'));
                  assert.ok(~m.str.indexOf('five'));
                  assert.ok(~m.str.indexOf('six'));
                  assert.ok(~m.str.indexOf('seven'));
                  assert.ok(~m.str.indexOf('eight'));

                  assert.equal(m.id.length,6);
                  assert.ok(~m.id.indexOf(id1));
                  assert.ok(~m.id.indexOf(id2));
                  assert.ok(~m.id.indexOf(id3));
                  assert.ok(~m.id.indexOf(id4));
                  assert.ok(~m.id.indexOf(id5));
                  assert.ok(~m.id.indexOf(id6));

                  assert.equal(m.date.length,6);
                  assert.ok(~m.date.indexOf(d1.toString()));
                  assert.ok(~m.date.indexOf(d2.toString()));
                  assert.ok(~m.date.indexOf(d3.toString()));
                  assert.ok(~m.date.indexOf(d4.toString()));
                  assert.ok(~m.date.indexOf(d5.toString()));
                  assert.ok(~m.date.indexOf(d6.toString()));

                  assert.equal(m.doc.length,6);
                  assert.ok(m.doc.some(function(v){return v.name === 'Waltz'}))
                  assert.ok(m.doc.some(function(v){return v.name === 'Dubstep'}))
                  assert.ok(m.doc.some(function(v){return v.name === 'Polka'}))
                  assert.ok(m.doc.some(function(v){return v.name === '8bit'}))
                  assert.ok(m.doc.some(function(v){return v.name === 'BigBeat'}))
                  assert.ok(m.doc.some(function(v){return v.name === 'Funk'}))
                  done();
                });
              });
            });
          });
        });
      });
    });
  })

  describe('nonAtomicPush()', function(){
    it('works', function(done){
      var db = start();
      var U = db.model('User');
      var ID = mongoose.Types.ObjectId;

      var u = new U({ name: 'banana', pets: [new ID] });
      assert.equal(u.pets.length,1);
      u.pets.nonAtomicPush(new ID);
      assert.equal(u.pets.length,2);
      u.save(function (err) {
        assert.ifError(err);
        U.findById(u._id, function (err) {
          assert.ifError(err);
          assert.equal(u.pets.length,2);
          var id0 = u.pets[0];
          var id1 = u.pets[1];
          var id2 = new ID;
          u.pets.pull(id0);
          u.pets.nonAtomicPush(id2);
          assert.equal(u.pets.length,2);
          assert.equal(u.pets[0].toString(),id1.toString());
          assert.equal(u.pets[1].toString(),id2.toString());
          u.save(function (err) {
            assert.ifError(err);
            U.findById(u._id, function (err) {
              db.close();
              assert.ifError(err);
              assert.equal(u.pets.length,2);
              assert.equal(u.pets[0].toString(),id1.toString());
              assert.equal(u.pets[1].toString(),id2.toString());
              done();
            });
          });
        });
      });
    });
  })

  describe('setting a doc array', function(){
    it('should adjust path positions', function(done){
      var db = start();

      var D = db.model('subDocPositions', new Schema({
          em1: [new Schema({ name: String })]
      }));

      var d = new D({
          em1: [
              { name: 'pos0' }
            , { name: 'pos1' }
            , { name: 'pos2' }
          ]
      });

      d.save(function (err) {
        assert.ifError(err);
        D.findById(d, function (err, d) {
          assert.ifError(err);

          var n = d.em1.slice();
          n[2].name = 'position two';
          var x = [];
          x[1] = n[2];
          x[2] = n[1];
          x = x.filter(Boolean);
          d.em1 = x;

          d.save(function (err) {
            assert.ifError(err);
            D.findById(d, function (err, d) {
              db.close();
              assert.ifError(err);
              assert.equal(d.em1[0].name,'position two');
              assert.equal(d.em1[1].name,'pos1');
              done();
            });
          });
        });
      });
    })
  })

  describe('paths with similar names', function(){
    it('should be saved', function(done){
      var db = start();

      var D = db.model('similarPathNames', new Schema({
          account: {
              role: String
            , roles: [String]
          }
        , em: [new Schema({ name: String })]
      }));

      var d = new D({
          account: { role: 'teacher', roles: ['teacher', 'admin'] }
        , em: [{ name: 'bob' }]
      });

      d.save(function (err) {
        assert.ifError(err);
        D.findById(d, function (err, d) {
          assert.ifError(err);

          d.account.role = 'president';
          d.account.roles = ['president', 'janitor'];
          d.em[0].name = 'memorable';
          d.em = [{ name: 'frida' }];

          d.save(function (err) {
            assert.ifError(err);
            D.findById(d, function (err, d) {
              db.close();
              assert.ifError(err);
              assert.equal(d.account.role,'president');
              assert.equal(d.account.roles.length, 2);
              assert.equal(d.account.roles[0], 'president');
              assert.equal(d.account.roles[1], 'janitor');
              assert.equal(d.em.length, 1);
              assert.equal(d.em[0].name, 'frida');
              done();
            });
          });
        });
      });
    })
  })

  it('modifying subdoc props and manipulating the array works (gh-842)', function(done){
    var db= start();
    var schema = new Schema({ em: [new Schema({ username: String })]});
    var M = db.model('modifyingSubDocAndPushing', schema);
    var m = new M({ em: [ { username: 'Arrietty' }]});

    m.save(function (err) {
      assert.ifError(err);
      M.findById(m, function (err, m) {
        assert.ifError(err);
        assert.equal(m.em[0].username, 'Arrietty');

        m.em[0].username = 'Shawn';
        m.em.push({ username: 'Homily' });
        m.save(function (err) {
          assert.ifError(err);

          M.findById(m, function (err, m) {
            assert.ifError(err);
            assert.equal(m.em.length, 2);
            assert.equal(m.em[0].username, 'Shawn');
            assert.equal(m.em[1].username, 'Homily');

            m.em[0].username = 'Arrietty';
            m.em[1].remove();
            m.save(function (err) {
              assert.ifError(err);

              M.findById(m, function (err, m) {
                db.close();
                assert.ifError(err);
                assert.equal(m.em.length, 1);
                assert.equal(m.em[0].username, 'Arrietty');
                done();
              });
            });
          });
        });
      });
    });
  })

  describe('default type', function(){
    it('casts to Mixed', function(){
      var db = start()
        , DefaultArraySchema = new Schema({
            num1: Array
          , num2: []
          })

      mongoose.model('DefaultArraySchema', DefaultArraySchema);
      var DefaultArray = db.model('DefaultArraySchema', collection);
      var arr = new DefaultArray();
      db.close();

      assert.equal(arr.get('num1').length, 0);
      assert.equal(arr.get('num2').length, 0);

      var threw1 = false
        , threw2 = false;

      try {
        arr.num1.push({ x: 1 })
        arr.num1.push(9)
        arr.num1.push("woah")
      } catch (err) {
        threw1 = true;
      }

      assert.equal(threw1, false);

      try {
        arr.num2.push({ x: 1 })
        arr.num2.push(9)
        arr.num2.push("woah")
      } catch (err) {
        threw2 = true;
      }

      assert.equal(threw2, false);
    })
  })

  describe('removing from an array atomically using MongooseArray#remove', function(){
    it('works', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      var post = new BlogPost();
      post.numbers.push(1, 2, 3);

      post.save(function (err) {
        assert.ifError(err);

        BlogPost.findById(post._id, function (err, doc) {
          assert.ifError(err);

          doc.numbers.remove('1');
          doc.save(function (err) {
            assert.ifError(err);

            BlogPost.findById(post.get('_id'), function (err, doc) {
              assert.ifError(err);

              assert.equal(doc.numbers.length, 2);
              doc.numbers.remove('2', '3');

              doc.save(function (err) {
                assert.ifError(err);

                BlogPost.findById(post._id, function (err, doc) {
                  db.close();
                  assert.ifError(err);
                  assert.equal(0, doc.numbers.length);
                  done();
                });
              });
            });
          });
        });
      });
    })
  })
})

