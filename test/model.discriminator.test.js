/**
 * Test dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , Schema = mongoose.Schema
  , assert = require('assert')
  , random = require('../lib/utils').random;

/**
 * Setup
 */
var PersonSchema = new Schema({ name: String });
var EmployeeSchema = new Schema({ name: String, department: String });

describe('model', function() {
  describe('discriminator()', function() {
    var db, Person, Employee;

    before(function(){
      db = start();
      Person = db.model('model-discriminator-person', PersonSchema, 'model-discriminator-'+random());
      Employee = Person.discriminator('model-discriminator-employee', EmployeeSchema);
    });

    after(function(done){
      db.close(done);
    });

    it('model defaults without discriminator', function(done) {
      var Model = db.model('model-discriminator-defaults', new Schema(), 'model-discriminator-'+random());
      assert.equal(Model.discriminators, undefined);
      done();
    });

    it('sets schema root discriminator mapping', function(done) {
      assert.deepEqual(PersonSchema.discriminatorMapping, { key: '__t', value: null, isRoot: true });
      done();
    });

    it('sets schema discriminator type mapping', function(done) {
      assert.deepEqual(EmployeeSchema.discriminatorMapping, { key: '__t', value: 'model-discriminator-employee', isRoot: false });
      done();
    });

    it('adds discriminatorKey to schema with default as name', function(done) {
      var type = EmployeeSchema.paths.__t;
      assert.equal(type.options.type, String);
      assert.equal(type.options.default, 'model-discriminator-employee');
      done();
    });

    it('adds discriminator to Model.discriminators object', function(done) {
      assert.equal(Object.keys(Person.discriminators).length, 1);
      assert.equal(Person.discriminators['model-discriminator-employee'], Employee);
      var newName = 'model-discriminator-' + random();
      var NewDiscriminatorType = Person.discriminator(newName, new Schema());
      assert.equal(Object.keys(Person.discriminators).length, 2);
      assert.equal(Person.discriminators[newName], NewDiscriminatorType);
      done();
    });

    it('throws error on invalid schema', function(done) {
      assert.throws(
        function() {
          Person.discriminator('Foo');
        },
        /You must pass a valid discriminator Schema/
      );
      done();
    });

    it('throws error when attempting to nest discriminators', function(done) {
      assert.throws(
        function() {
          Employee.discriminator('model-discriminator-foo', new Schema());
        },
        /Discriminator "model-discriminator-foo" can only be a discriminator of the root model/
      );
      done();
    });

    it('throws error when discriminator has mapped discriminator key in schema', function(done) {
      assert.throws(
        function() {
          Person.discriminator('model-discriminator-foo', new Schema({ __t: String }));
        },
        /Discriminator "model-discriminator-foo" cannot have field with name "__t"/
      );
      done();
    });

    it('throws error when discriminator has mapped discriminator key in schema with discriminatorKey option set', function(done) {
      assert.throws(
        function() {
          var Foo = db.model('model-discriminator-foo', new Schema({}, { discriminatorKey: '_type' }), 'model-discriminator-'+random());
          Foo.discriminator('model-discriminator-bar', new Schema({ _type: String }));
        },
        /Discriminator "model-discriminator-bar" cannot have field with name "_type"/
      );
      done();
    });
  });
});
