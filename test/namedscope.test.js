//BoundQuery
//
//Query.prototype.with(criteria)
//Query.prototype.with(criteria, callback)
//Query.prototype.with(path, val, callback)
//
//Query.prototype.with(criteria).find()
//Query.prototype.with(criteria).remove()
//Query.prototype.with(criteria).findOne()
//Query.prototype.with(criteria).update()
//Query.prototype.with(criteria).count()
//
//var query = UserNS.find(...);
//
//var twenties = new Query().with('age').gte(20).lt(30);
//var male = new Query().with('gender', 'male');
//var active = new Query().with('lastLogin').gte(+new Date - (24 * 3600 * 1000));
//
//UserNS.twenties = Query.with('age').gte(20).lt(30);
//UserNS.male = Query.with('gender', 'male');
//UserNS.active = Query.with('lastLogin').get(+new Date - (24 * 3600 * 1000));
//
//UserNS.namedScope({
//    twenties: Query.with('age').gte(20).lt(30)
//  , male: Query.with('gender', 'male')
//  , lastLogin: Query.with('lastLogin').get(+new Date - (24 * 3600 * 1000))
//});
//
//UserNS.namedScope('twenties').with('age').gte(20).lt(30);
//
//UserNS.namedScope('olderThan', function (age) {
//  return this.with('age').gt(age);
//});
//
//UserNS.find(twenties, male, active, function (err, found) {
//});
//
//// twenties.male OR twenties.active
//UserNS.find(twenties.male, twenties.active, function (err, found) {
//});
//
//UserNS.find(olderThan(20).male, olderThan(30).active, function (err, found) {
//});
//
//UserNS.twenties.male.active.find(callback);
//
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
  , gender: {type: String}
  , lastLogin: Date
});

UserNSSchema.namedScope('olderThan', function (age) {
  return this.with('age').gt(age);
});

UserNSSchema.namedScope('youngerThan', function (age) {
  return this.with(age).lt(age);
});

UserNSSchema.namedScope('twenties').olderThan(19).youngerThan(30);

UserNSSchema.namedScope('male').with('gender', 'male');

UserNSSchema.namedScope('female').with('gender', 'female');

UserNSSchema.namedScope('active', function () {
  return this.with('lastLogin').gte(+new Date - _24hours)
});

mongoose.model('UserNS', UserNSSchema);

module.exports = {
  'basic named scopes should work': function () {
    var db = start()
      , UserNS = db.model('UserNS', 'users_' + random());
    UserNS.create({gender: 'male'}, function (err, _) {
      should.strictEqual(err, null);
      UserNS.create({gender: 'male'}, function (err, _) {
        should.strictEqual(err, null);
        UserNS.create({gender: 'female'}, function (err, _) {
          should.strictEqual(err, null);
          UserNS.male.find( function (err, found) {
            db.close();
            should.strictEqual(err, null);
            found.should.have.length(2);
          });
        });
      });
    });
  },
//  'dynamic named scopes should work': function () {
//    var db = start()
//      , UserNS = db.model('UserNS', 'users_' + random());
//    UserNS.create({age: 21}, function (err, _) {
//      should.strictEqual(err, null);
//      UserNS.create({gender: 22}, function (err, _) {
//        should.strictEqual(err, null);
//        UserNS.create({gender: 19}, function (err, _) {
//          should.strictEqual(err, null);
//          UserNS.olderThan(20).find( function (err, found) {
//            db.close();
//            should.strictEqual(err, null);
//            found.should.have.length(2);
//          });
//        });
//      });
//    });
//  },
//  'named scopes built on top of dynamic named scopes should work': function () {
//    var db = start()
//      , UserNS = db.model('UserNS', 'users_' + random());
//    UserNS.create({age: 21}, function (err, _) {
//      should.strictEqual(err, null);
//      UserNS.create({gender: 22}, function (err, _) {
//        should.strictEqual(err, null);
//        UserNS.create({gender: 19}, function (err, _) {
//          should.strictEqual(err, null);
//          UserNS.twenties.find( function (err, found) {
//            db.close();
//            should.strictEqual(err, null);
//            found.should.have.length(2);
//          });
//        });
//      });
//    });
//  },
//  'chaining named scopes should work': function () {
//    var db = start()
//      , UserNS = db.model('UserNS', 'users_' + random());
//    UserNS.create({age: 21, gender: 'male', lastLogin: (+new Date) - _24hours - 3600}, function (err, _) {
//      should.strictEqual(err, null);
//      UserNS.create({age: 45, gender: 'male', lastLogin: +new Date}, function (err, match) {
//        should.strictEqual(err, null);
//        UserNS.create({age: 50, gender: 'female', lastLogin: +new Date}, function (err, _) {
//          should.strictEqual(err, null);
//          UserNS.olderThan(40).active.male.find( function (err, found) {
//            db.close();
//            should.strictEqual(err, null);
//            found.should.have.length(1);
//            found[0]._id.should.eql(match._id);
//          });
//        });
//      });
//    });
//  },
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
