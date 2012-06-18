
//Query.prototype.where(criteria, callback)
//Query.prototype.where(path, val, callback)
//
//UserNS.namedScope({
//    twenties: Query.where('age').gte(20).lt(30)
//  , male: Query.where('gender', 'male')
//  , lastLogin: Query.where('lastLogin').get(+new Date - (24 * 3600 * 1000))
//});
//
//UserNS.find(twenties, male, active, function (err, found) {
//});
//
//// twenties.male OR twenties.active
//UserNS.twenties.male.OR.twenties.active.find(callback);
//UserNS.find(twenties.male, twenties.active, function (err, found) {
//});
//
//UserNS.find(olderThan(20).male, olderThan(30).active, function (err, found) {
//});
//UserNS.twenties.male.active.remove(callback);

/**
 * Test dependencies.
 */

var start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , random = require('../lib/utils').random
  , Schema = mongoose.Schema
  , _24hours = 24 * 3600 * 1000;

/**
 * Setup.
 */

var UserNSSchema = new Schema({
    age: Number
  , gender: String
  , lastLogin: Date
});

UserNSSchema.namedScope('olderThan', function (age) {
  return this.where('age').gt(age);
});

UserNSSchema.namedScope('youngerThan', function (age) {
  return this.where('age').lt(age);
});

UserNSSchema.namedScope('twenties').olderThan(19).youngerThan(30);

UserNSSchema.namedScope('male').where('gender', 'male');

UserNSSchema.namedScope('female').where('gender', 'female');

UserNSSchema.namedScope('active', function () {
  return this.where('lastLogin').gte(+new Date - _24hours)
});

mongoose.model('UserNS', UserNSSchema);

// TODO Add in tests for using named scopes where findOne, update, remove

describe('named scope', function(){
  it('basic named scopes should work, for find', function(done){
    var db = start()
      , UserNS = db.model('UserNS', 'users_' + random());

    UserNS.create(
        {gender: 'male'}
      , {gender: 'male'}
      , {gender: 'female'}
      , function (err, _) {
        assert.ifError(err);
        UserNS.male.find( function (err, found) {
          db.close();
          assert.ifError(err);
          assert.equal(2, found.length);
          done();
        });
    });
  })

  it('dynamic named scopes should work, for find', function(done){
    var db = start()
      , UserNS = db.model('UserNS', 'users_' + random());
    UserNS.create(
        {age: 21}
      , {age: 22}
      , {age: 19}
      , function (err, _) {
          assert.ifError(err);
          UserNS.olderThan(20).find( function (err, found) {
            db.close();
            assert.ifError(err);
            assert.equal(2, found.length);
            done();
          });
        }
    );
  })

  it('named scopes built on top of dynamic named scopes should work, for find', function(done){
    var db = start()
      , UserNS = db.model('UserNS', 'users_' + random());
    UserNS.create(
        {age: 21}
      , {age: 22}
      , {age: 19}
      , function (err, _) {
        assert.ifError(err);
        UserNS.twenties.find( function (err, found) {
          db.close();
          assert.ifError(err);
          assert.equal(2, found.length);
          done();
        });
      }
    );
  });

  it('chaining named scopes should work, for find', function(done){
    var db = start()
      , UserNS = db.model('UserNS', 'users_' + random());
    UserNS.create(
        {age: 21, gender: 'male', lastLogin: (+new Date) - _24hours - 3600}
      , {age: 45, gender: 'male', lastLogin: +new Date}
      , {age: 50, gender: 'female', lastLogin: +new Date}
      , function (err, _, match, _) {
        assert.ifError(err);
        UserNS.olderThan(40).active.male.find( function (err, found) {
          db.close();
          assert.ifError(err);
          assert.equal(1, found.length);
          assert.deepEqual(found[0]._id,match._id);
          done();
        });
      }
    );
  })

  it('basic named scopes should work, for remove', function(done){
    var db = start()
      , UserNS = db.model('UserNS', 'users_' + random());
    UserNS.create(
        {gender: 'male'}
      , {gender: 'male'}
      , {gender: 'female'}
      , function (err, _) {
        assert.ifError(err);
        UserNS.male.remove( function (err) {
          assert.ifError(err);
          UserNS.male.find( function (err, found) {
            db.close();
            assert.ifError(err);
            assert.equal(0, found.length);
            done();
          });
        });
      }
    );
  })

  it('basic named scopes should work, for update', function(done){
    var db = start()
      , UserNS = db.model('UserNS', 'users_' + random());
    UserNS.create(
        {gender: 'male'}
      , {gender: 'male'}
      , {gender: 'female'}
      , function (err, male1, male2, female1) {
        assert.ifError(err);
        UserNS.male.update({gender: 'female'}, function (err) {
          assert.ifError(err);
          UserNS.female.find( function (err, found) {
            assert.ifError(err);
            assert.equal(2, found.length);
            UserNS.male.find( function (err, found) {
              db.close();
              assert.ifError(err);
              assert.equal(1, found.length);
              done();
            });
          });
        });
      }
    );
  })

  it('chained named scopes should work, for findOne', function(done){
    var db = start()
      , UserNS = db.model('UserNS', 'users_' + random());
    UserNS.create(
        {age: 100, gender: 'male'}
      , function (err, maleCentenarian) {
        assert.ifError(err);
        UserNS.male.olderThan(99).findOne( function (err, found) {
          db.close();
          assert.ifError(err);
          assert.deepEqual(found._id,maleCentenarian._id);
          done();
        });
      }
    );
  })

  it('hybrid use of chained named scopes and ad hoc querying should work', function(done){
    var db = start()
      , UserNS = db.model('UserNS', 'users_' + random());
    UserNS.create(
        {age: 100, gender: 'female'}
      , function (err, femaleCentenarian) {
        assert.ifError(err);
        UserNS.female.where('age').gt(99).findOne( function (err, found) {
          db.close();
          assert.ifError(err);
          assert.deepEqual(found._id,femaleCentenarian._id);
          done();
        });
      }
    );
  })
})
//  'using chained named scopes in a find': function () {
//    var db = start()
//      , UserNS = db.model('UserNS', 'users_' + random());
//    UserNS.create({age: 21, gender: 'male', lastLogin: (+new Date) - _24hours - 3600}, function (err, _) {
//      should.strictEqual(err, null);
//      UserNS.create({age: 45, gender: 'male', lastLogin: +new Date}, function (err, match) {
//        should.strictEqual(err, null);
//        UserNS.create({age: 50, gender: 'female', lastLogin: +new Date}, function (err, _) {
//          should.strictEqual(err, null);
//          UserNS.find(olderThan(40).active.male, function (err, found) {
//            db.close();
//            should.strictEqual(err, null);
//            found.should.have.length(1);
//            found[0]._id.should.eql(match._id);
//          });
//        });
//      });
//    });
//  },
//  'using multiple chained named scopes in a find to do an OR': function () {
//    var db = start()
//      , UserNS = db.model('UserNS', collection);
//    var db = start()
//      , UserNS = db.model('UserNS', collection);
//    UserNS.create(
//        {age: 21, gender: 'male', lastLogin: (+new Date) - _24hours - 3600}
//      , {age: 45, gender: 'male', lastLogin: +new Date}
//      , {age: 50, gender: 'female', lastLogin: +new Date}
//      , {age: 35, gender: 'female', lastLogin: +new Date}
//      , function (err, a, b, c, d) {
//          should.strictEqual(err, null);
//          UserNS.find(twenties.active.male, thirties.active.female, function (err, found) {
//            db.close();
//            should.strictEqual(err, null);
//            found.should.have.length(2);
//          });
//        }
//    );
//  },
//};
