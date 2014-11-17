/**
 * Test dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , Schema = mongoose.Schema
  , assert = require('assert')
  , util = require('util')
  , clone = require('../lib/utils').clone
  , random = require('../lib/utils').random;

/**
 * Setup
 */
var PersonSchema = new Schema({
    name: { first: String, last: String }
  , gender: String
}, { collection: 'model-discriminator-'+random() });
PersonSchema.index({ name: 1 });
PersonSchema.methods.getFullName = function() {
  return this.name.first + ' ' + this.name.last;
};
PersonSchema.statics.findByGender = function(gender, cb) {};
PersonSchema.virtual('name.full').get(function () {
  return this.name.first + ' ' + this.name.last;
});
PersonSchema.virtual('name.full').set(function (name) {
  var split = name.split(' ');
  this.name.first = split[0];
  this.name.last = split[1];
});
PersonSchema.path('gender').validate(function(value) {
  return /[A-Z]/.test(value);
}, 'Invalid name');
PersonSchema.post('save', function (next) {
  next();
});
PersonSchema.set('toObject', { getters: true, virtuals: true });
PersonSchema.set('toJSON',   { getters: true, virtuals: true });

var EmployeeSchema = new Schema({ department: String });
EmployeeSchema.index({ department: 1 });
EmployeeSchema.methods.getDepartment = function() {
  return this.department;
};
EmployeeSchema.statics.findByDepartment = function(department, cb) {};
EmployeeSchema.path('department').validate(function(value) {
  return /[a-zA-Z]/.test(value);
}, 'Invalid name');
var employeeSchemaPreSaveFn = function (next) {
  next();
};
EmployeeSchema.pre('save', employeeSchemaPreSaveFn);
EmployeeSchema.set('toObject', { getters: true, virtuals: false });
EmployeeSchema.set('toJSON',   { getters: false, virtuals: true });

describe('model', function() {
  describe('discriminator()', function() {
    var db, Person, Employee;

    before(function(){
      db = start();
      Person = db.model('model-discriminator-person', PersonSchema);
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

    it('is instance of root', function(done) {
      var employee = new Employee();
      assert.ok(employee instanceof Person);
      assert.ok(employee instanceof Employee);
      assert.strictEqual(employee.__proto__.constructor, Employee);
      assert.strictEqual(employee.__proto__.__proto__.constructor, Person);
      done();
    });

    it('can define static and instance methods', function(done) {
      function BossBaseSchema() {
        Schema.apply(this, arguments);

        this.add({
          name: String,
          createdAt: Date
        });
      }
      util.inherits(BossBaseSchema, Schema);

      var PersonSchema = new BossBaseSchema();
      var BossSchema = new BossBaseSchema({ department: String });
      BossSchema.methods.myName = function(){
        return this.name;
      };
      BossSchema.statics.currentPresident = function(){
        return 'obama';
      };
      var Person = db.model('Person', PersonSchema);
      var Boss = Person.discriminator('Boss', BossSchema);

      var boss = new Boss({name:'Bernenke'});
      assert.equal(boss.myName(), 'Bernenke');
      assert.equal(boss.notInstanceMethod, undefined);
      assert.equal(Boss.currentPresident(), 'obama');
      assert.equal(Boss.notStaticMethod, undefined);
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

    it('throws error when discriminator with taken name is added', function(done) {
      var Foo = db.model('model-discriminator-foo', new Schema({}), 'model-discriminator-'+random());
      Foo.discriminator('model-discriminator-taken', new Schema());
      assert.throws(
        function() {
          Foo.discriminator('model-discriminator-taken', new Schema());
        },
        /Discriminator with name "model-discriminator-taken" already exists/
      );
      done();
    });

    describe('options', function() {
      it('allows toObject to be overridden', function(done) {
        assert.notDeepEqual(Employee.schema.get('toObject'), Person.schema.get('toObject'));
        assert.deepEqual(Employee.schema.get('toObject'), { getters: true, virtuals: false });
        done();
      });

      it('allows toJSON to be overridden', function(done) {
        assert.notDeepEqual(Employee.schema.get('toJSON'), Person.schema.get('toJSON'));
        assert.deepEqual(Employee.schema.get('toJSON'), { getters: false, virtuals: true });
        done();
      });

      it('is not customizable', function(done) {
          var errorMessage
            , CustomizedSchema = new Schema({}, { capped: true });
          try {
              Person.discriminator('model-discriminator-custom', CustomizedSchema);
          } catch (e) {
              errorMessage = e.message
          }

          assert.equal(errorMessage, 'Discriminator options are not customizable (except toJSON & toObject)');
          done();
      });
    });

    describe('root schema inheritance', function() {
      it('inherits field mappings', function(done) {
        assert.strictEqual(Employee.schema.path('name'), Person.schema.path('name'));
        assert.strictEqual(Employee.schema.path('gender'), Person.schema.path('gender'));
        assert.equal(Person.schema.paths.department, undefined);
        done();
      });

      it('inherits validators', function(done) {
        assert.strictEqual(Employee.schema.path('gender').validators, PersonSchema.path('gender').validators);
        assert.strictEqual(Employee.schema.path('department').validators, EmployeeSchema.path('department').validators);
        done();
      });

      it('does not inherit and override fields that exist', function(done) {
        var FemaleSchema = new Schema({ gender: { type: String, default: 'F' }})
          , Female = Person.discriminator('model-discriminator-female', FemaleSchema);

        var gender = Female.schema.paths.gender;

        assert.notStrictEqual(gender, Person.schema.paths.gender);
        assert.equal(gender.instance, 'String');
        assert.equal(gender.options.default, 'F');
        done();
      });

      it('inherits methods', function(done) {
        var employee = new Employee();
        assert.strictEqual(employee.getFullName, PersonSchema.methods.getFullName);
        assert.strictEqual(employee.getDepartment, EmployeeSchema.methods.getDepartment);
        assert.equal((new Person).getDepartment, undefined);
        done();
      });

      it('inherits statics', function(done) {
        assert.strictEqual(Employee.findByGender, EmployeeSchema.statics.findByGender);
        assert.strictEqual(Employee.findByDepartment, EmployeeSchema.statics.findByDepartment);
        assert.equal(Person.findByDepartment, undefined);
        done();
      });

      it('inherits virtual (g.s)etters', function(done) {
        var employee = new Employee();
        employee.name.full = 'John Doe';
        assert.equal(employee.name.full, 'John Doe');
        done();
      });

      it('merges callQueue with base queue defined before discriminator types callQueue', function(done) {
        assert.equal(Employee.schema.callQueue.length, 2);
        // PersonSchema.post('save')
        assert.strictEqual(Employee.schema.callQueue[0], Person.schema.callQueue[0]);

        // EmployeeSchema.pre('save')
        assert.strictEqual(Employee.schema.callQueue[1][0], 'pre');
        assert.strictEqual(Employee.schema.callQueue[1][1]['0'], 'save');
        assert.strictEqual(Employee.schema.callQueue[1][1]['1'], employeeSchemaPreSaveFn);
        done();
      });

      it('does not inherit indexes', function(done) {
        assert.deepEqual(Person.schema.indexes(), [[{ name: 1 }, { background: true, safe: undefined }]]);
        assert.deepEqual(Employee.schema.indexes(), [[{ department: 1 }, { background: true, safe: undefined }]]);
        done();
      });

      it('gets options overridden by root options except toJSON and toObject', function(done) {
        var personOptions = clone(Person.schema.options)
          , employeeOptions = clone(Employee.schema.options);

        delete personOptions.toJSON;
        delete personOptions.toObject;
        delete employeeOptions.toJSON;
        delete employeeOptions.toObject;

        assert.deepEqual(personOptions, employeeOptions);
        done();
      });
    });
  });
});
