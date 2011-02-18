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
  , should = require('should')
  , mongoose = start.mongoose
  , random = require('mongoose/utils').random
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
module.exports = {
  'basic named scopes should work, for find': function () {
    var db = start()
      , UserNS = db.model('UserNS', 'users_' + random());
    UserNS.create(
        {gender: 'male'}
      , {gender: 'male'}
      , {gender: 'female'}
      , function (err, _) {
          should.strictEqual(err, null);
          UserNS.male.find( function (err, found) {
            db.close();
            should.strictEqual(err, null);
            found.should.have.length(2);
          });
        }
    );
  },
  'dynamic named scopes should work, for find': function () {
    var db = start()
      , UserNS = db.model('UserNS', 'users_' + random());
    UserNS.create(
        {age: 21}
      , {age: 22}
      , {age: 19}
      , function (err, _) {
          should.strictEqual(err, null);
          UserNS.olderThan(20).find( function (err, found) {
            db.close();
            should.strictEqual(err, null);
            found.should.have.length(2);
          });
        }
    );
  },
  'named scopes built on top of dynamic named scopes should work, for find': function () {
    var db = start()
      , UserNS = db.model('UserNS', 'users_' + random());
    UserNS.create(
        {age: 21}
      , {age: 22}
      , {age: 19}
      , function (err, _) {
          should.strictEqual(err, null);
          UserNS.twenties.find( function (err, found) {
            db.close();
            should.strictEqual(err, null);
            found.should.have.length(2);
          });
        }
    );
  },
  'chaining named scopes should work, for find': function () {
    var db = start()
      , UserNS = db.model('UserNS', 'users_' + random());
    UserNS.create(
        {age: 21, gender: 'male', lastLogin: (+new Date) - _24hours - 3600}
      , {age: 45, gender: 'male', lastLogin: +new Date}
      , {age: 50, gender: 'female', lastLogin: +new Date}
      , function (err, _, match, _) {
          should.strictEqual(err, null);
          UserNS.olderThan(40).active.male.find( function (err, found) {
            db.close();
            should.strictEqual(err, null);
            found.should.have.length(1);
            found[0]._id.should.eql(match._id);
          });
        }
    );
  },

  'basic named scopes should work, for remove': function () {
    var db = start()
      , UserNS = db.model('UserNS', 'users_' + random());
    UserNS.create(
        {gender: 'male'}
      , {gender: 'male'}
      , {gender: 'female'}
      , function (err, _) {
          UserNS.male.remove( function (err) {
            should.strictEqual(err, null);
            UserNS.male.find( function (err, found) {
              db.close();
              should.strictEqual(err, null);
              found.should.have.length(0);
            });
          });
        }
    );
  },

  // TODO multi-updates
  'basic named scopes should work, for update': function () {
    var db = start()
      , UserNS = db.model('UserNS', 'users_' + random());
    UserNS.create(
        {gender: 'male'}
      , {gender: 'male'}
      , {gender: 'female'}
      , function (err, male1, male2, female1) {
          should.strictEqual(err, null);
          UserNS.male.update({gender: 'female'}, function (err) {
            should.strictEqual(err, null);
            UserNS.female.find( function (err, found) {
              should.strictEqual(err, null);
              found.should.have.length(2);
              UserNS.male.find( function (err, found) {
                db.close();
                should.strictEqual(err, null);
                found.should.have.length(1);
              });
            });
          });
        }
    );
  },

  'chained named scopes should work, for findOne': function () {
    var db = start()
      , UserNS = db.model('UserNS', 'users_' + random());
    UserNS.create(
        {age: 100, gender: 'male'}
      , function (err, maleCentenarian) {
          should.strictEqual(err, null);
          UserNS.male.olderThan(99).findOne( function (err, found) {
            db.close();
            should.strictEqual(err, null);
            found._id.should.eql(maleCentenarian._id);
          });
        }
    );
  },

  'hybrid use of chained named scopes and ad hoc querying should work': function () {
    var db = start()
      , UserNS = db.model('UserNS', 'users_' + random());
    UserNS.create(
        {age: 100, gender: 'female'}
      , function (err, femaleCentenarian) {
          should.strictEqual(null, err);
          UserNS.female.where('age').gt(99).findOne( function (err, found) {
            db.close();
            should.strictEqual(err, null);
            found._id.should.eql(femaleCentenarian._id);
          });
        }
    );
  },
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
};
