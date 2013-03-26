/**
 * Module dependencies
 */

var start = require('./common')
  , Aggregate = require('../lib/aggregate')
  , mongoose = start.mongoose
  , Schema = mongoose.Schema
  , assert = require('assert');

/**
 * Test data
 */

var EmployeeSchema = new Schema({
    name: String
  , sal: Number
  , dept: String
});

var Employee = mongoose.model('Employee', EmployeeSchema);

function setupData(callback) {
  var saved = 0
    , emps = [
        { name: "Alice", sal: 18000, dept: "sales" }
	  , { name: "Bob", sal: 15000, dept: "sales" }
	  , { name: "Carol", sal: 14000, dept: "r&d" }
	  , { name: "Dave", sal: 14000, dept: "r&d" }
    ]
    , db = start()
    , Employee = db.model('Employee');
    
  emps.forEach(function(data) {
    var emp = new Employee(data);
    
    emp.save(function() {
      if (++saved === emps.length) {
        callback(db);
      }
    });
  });
}

function clearData(db, callback) {
  db.model('Employee').find({}).remove(callback);
}

/**
 * Test.
 */

describe('Aggregate', function() {
  describe('append', function() {
    it('(pipeline)', function(done) {
      var aggregate = new Aggregate();
      
      assert.equal(aggregate.append({ a: 1 }, { b: 2 }, { c: 3 }), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ a: 1 }, { b: 2 }, { c: 3 }]);
      
      aggregate.append({ d: 4 }, { c: 5 });
      assert.deepEqual(aggregate._pipeline, [{ a: 1 }, { b: 2 }, { c: 3 }, { d: 4 }, { c: 5 }]);
      
      done();
    });
    
    it('throws if non-object parameter is passed', function(done) {
      var aggregate = new Aggregate()
        , regexp = /Arguments must be aggregate pipeline operators/;
      
      assert.throws(function() {
        aggregate.append({ a: 1 }, "string");
      }, regexp);
      
      assert.throws(function() {
        aggregate.append({ a: 1 }, ["array"]);
      }, regexp);
      
      done();
    });
    
    it('does not throw when 0 args passed', function(done) {
      var aggregate = new Aggregate();
      
      assert.doesNotThrow(function() {
        aggregate.append();
      });
      
      done();
    });
  });
  
  describe('select', function() {
    it('(object)', function(done) {
      var aggregate = new Aggregate();
      
      assert.equal(aggregate.select({ a: 1, b: 1, c: 0 }), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }]);
      
      aggregate.select({ b: 1 });
      assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }, { $project: { b: 1 } }]);
      
      done();
    });
    
    it('(string)', function(done) {
      var aggregate = new Aggregate();
      
      aggregate.select(" a b   -c  ");
      assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }]);
      
      aggregate.select("b");
      assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }, { $project: { b: 1 } }]);
      
      done();
    });
    
    it('("a","b","c")', function(done) {
      assert.throws(function() {
        var aggregate = new Aggregate();
        aggregate.select("a", "b", "c");
      }, /Invalid select/);
      
      done();
    });
    
    it('["a","b","c"]', function(done) {
      assert.throws(function() {
        var aggregate = new Aggregate();
        aggregate.select(["a", "b", "c"]);
      }, /Invalid select/);
      
      done();
    });
  });
  
  describe('project', function() {
    it('works', function(done) {
      var aggregate = new Aggregate();
      
      assert.equal(aggregate.project({ a: 1, b: 2 }), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 2 } }]);
      
      aggregate.project({ c: 3 });
      assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 2 } }, { $project: { c: 3 } }]);
      
      done();
    });
  });
  
  describe('group', function() {
    it('works', function(done) {
      var aggregate = new Aggregate();
      
      assert.equal(aggregate.group({ a: 1, b: 2 }), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $group: { a: 1, b: 2 } }]);
      
      aggregate.group({ c: 3 });
      assert.deepEqual(aggregate._pipeline, [{ $group: { a: 1, b: 2 } }, { $group: { c: 3 } }]);
      
      done();
    });
  });
  
  describe('skip', function() {
    it('works', function(done) {
      var aggregate = new Aggregate();
      
      assert.equal(aggregate.skip(42), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $skip: 42 }]);
      
      aggregate.skip(42);
      assert.deepEqual(aggregate._pipeline, [{ $skip: 42 }, { $skip: 42 }]);
      
      done();
    });
  });
  
  describe('limit', function() {
    it('works', function(done) {
      var aggregate = new Aggregate();
      
      assert.equal(aggregate.limit(42), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $limit: 42 }]);
      
      aggregate.limit(42);
      assert.deepEqual(aggregate._pipeline, [{ $limit: 42 }, { $limit: 42 }]);
      
      done();
    });
  });

  describe('cast', function() {
    it('works', function(done) {
      var aggregate = new Aggregate()
        , model = { foo: 42 };
      
      assert.equal(aggregate.cast(model), aggregate);
      assert.equal(aggregate._model, model);
      
      done();
    });
  });

  describe('exec', function() {
    it('project', function(done) {
      var aggregate = new Aggregate();
      
      setupData(function (db) {
        aggregate
          .cast(db.model('Employee'))
          .project({ sal: 1, sal_k: { $divide: [ "$sal", 1000 ] } })
          .exec(function (err, docs) {
            assert.ifError(err);
            docs.forEach(function (doc) {
              assert.equal(doc.sal / 1000, doc.sal_k);
            });
          
            clearData(db, function () { done(); });
          });
      });
    });
    
    it('group', function(done) {
      var aggregate = new Aggregate();
      
      setupData(function (db) {
        aggregate
          .cast(db.model('Employee'))
          .group({ _id: "$dept" })
          .exec(function (err, docs) {
            var depts;
            
            assert.ifError(err);
            assert.equal(docs.length, 2);
            
            depts = docs.map(function(doc) { return doc._id; });
            assert.notEqual(depts.indexOf("sales"), -1);
            assert.notEqual(depts.indexOf("r&d"), -1);
          
            clearData(db, function () { done(); });
          });
      });
    });
    
    it('skip', function(done) {
      var aggregate = new Aggregate();

      setupData(function (db) {
        aggregate
          .cast(db.model('Employee'))
          .skip(1)
          .exec(function (err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 3);
          
            clearData(db, function () { done(); });
          });
      });
    });
    
    it('limit', function(done) {
      var aggregate = new Aggregate();

      setupData(function (db) {
        aggregate
          .cast(db.model('Employee'))
          .limit(3)
          .exec(function (err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 3);
          
            clearData(db, function () { done(); });
          });
      });
    });

    it('error when empty pipeline', function(done) {
      var aggregate = new Aggregate()
        , callback;
      
      callback = function(err, docs) {
        assert(err);
        assert.equal(err.message, "Aggregate has empty pipeline");
        done();
      };
      
      aggregate.exec(callback);
  	});
  	
    it('error when not bound to a model', function(done) {
      var aggregate = new Aggregate()
        , callback;
      
      callback = function(err, docs) {
        assert(err);
        assert.equal(err.message, "Aggregate not bound to any Model");
        done();
      };
      
      aggregate.skip(0);
      aggregate.exec(callback);
    });
  });
});