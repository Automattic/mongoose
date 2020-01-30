'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const clone = require('../lib/utils').clone;
const co = require('co');
const random = require('../lib/utils').random;
const util = require('util');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

/**
 * Setup
 */
const PersonSchema = new Schema({
  name: {first: String, last: String},
  gender: String
}, {collection: 'model-discriminator-' + random()});
PersonSchema.index({name: 1});
PersonSchema.methods.getFullName = function() {
  return this.name.first + ' ' + this.name.last;
};
PersonSchema.methods.toJSonConfig = {
  include: ['prop1', 'prop2'],
  exclude: ['prop3', 'prop4']
};
PersonSchema.statics.findByGender = function() {
};
PersonSchema.virtual('name.full').get(function() {
  return this.name.first + ' ' + this.name.last;
});
PersonSchema.virtual('name.full').set(function(name) {
  var split = name.split(' ');
  this.name.first = split[0];
  this.name.last = split[1];
});
PersonSchema.path('gender').validate(function(value) {
  return /[A-Z]/.test(value);
}, 'Invalid name');
PersonSchema.set('toObject', {getters: true, virtuals: true});
PersonSchema.set('toJSON', {getters: true, virtuals: true});

var EmployeeSchema = new Schema({department: String});
EmployeeSchema.index({department: 1});
EmployeeSchema.methods.getDepartment = function() {
  return this.department;
};
EmployeeSchema.statics.findByDepartment = function() {
};
EmployeeSchema.path('department').validate(function(value) {
  return /[a-zA-Z]/.test(value);
}, 'Invalid name');
var employeeSchemaPreSaveFn = function(next) {
  next();
};
EmployeeSchema.pre('save', employeeSchemaPreSaveFn);
EmployeeSchema.set('toObject', {getters: true, virtuals: false});
EmployeeSchema.set('toJSON', {getters: false, virtuals: true});

describe('model', function() {
  let db;

  before(function() {
    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  describe('discriminator()', function() {
    var Person, Employee;

    before(function() {
      db = start();
      Person = db.model('model-discriminator-person', PersonSchema);
      Employee = Person.discriminator('model-discriminator-employee', EmployeeSchema);
    });

    it('model defaults without discriminator', function(done) {
      var Model = db.model('model-discriminator-defaults', new Schema(), 'model-discriminator-' + random());
      assert.equal(Model.discriminators, undefined);
      done();
    });

    it('is instance of root', function(done) {
      assert.equal(Employee.baseModelName, 'model-discriminator-person');
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
      var BossSchema = new BossBaseSchema({department: String});
      BossSchema.methods.myName = function() {
        return this.name;
      };
      BossSchema.statics.currentPresident = function() {
        return 'obama';
      };
      var Person = db.model('Person', PersonSchema);
      var Boss = Person.discriminator('Boss', BossSchema);

      var boss = new Boss({name: 'Bernenke'});
      assert.equal(boss.myName(), 'Bernenke');
      assert.equal(boss.notInstanceMethod, undefined);
      assert.equal(Boss.currentPresident(), 'obama');
      assert.equal(Boss.notStaticMethod, undefined);
      done();
    });

    it('sets schema root discriminator mapping', function(done) {
      assert.deepEqual(Person.schema.discriminatorMapping, {key: '__t', value: null, isRoot: true});
      done();
    });

    it('sets schema discriminator type mapping', function(done) {
      assert.deepEqual(Employee.schema.discriminatorMapping, {key: '__t', value: 'model-discriminator-employee', isRoot: false});
      done();
    });

    it('adds discriminatorKey to schema with default as name', function(done) {
      var type = Employee.schema.paths.__t;
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
            Person.discriminator('model-discriminator-foo', new Schema({__t: String}));
          },
          /Discriminator "model-discriminator-foo" cannot have field with name "__t"/
      );
      done();
    });

    it('throws error when discriminator has mapped discriminator key in schema with discriminatorKey option set', function(done) {
      assert.throws(
          function() {
            var Foo = db.model('model-discriminator-foo', new Schema({}, {discriminatorKey: '_type'}), 'model-discriminator-' + random());
            Foo.discriminator('model-discriminator-bar', new Schema({_type: String}));
          },
          /Discriminator "model-discriminator-bar" cannot have field with name "_type"/
      );
      done();
    });

    it('throws error when discriminator with taken name is added', function(done) {
      var Foo = db.model('model-discriminator-foo', new Schema({}), 'model-discriminator-' + random());
      Foo.discriminator('model-discriminator-taken', new Schema());
      assert.throws(
          function() {
            Foo.discriminator('model-discriminator-taken', new Schema());
          },
          /Discriminator with name "model-discriminator-taken" already exists/
      );
      done();
    });

    it('throws error if model name is taken (gh-4148)', function(done) {
      var Foo = db.model('model-discriminator-4148', new Schema({}));
      db.model('model-discriminator-4148-bar', new Schema({}));
      assert.throws(
        function() {
          Foo.discriminator('model-discriminator-4148-bar', new Schema());
        },
        /Cannot overwrite `model-discriminator-4148-bar`/);
      done();
    });

    it('works with nested schemas (gh-2821)', function(done) {
      var MinionSchema = function() {
        mongoose.Schema.apply(this, arguments);

        this.add({
          name: String
        });
      };
      util.inherits(MinionSchema, mongoose.Schema);

      var BaseSchema = function() {
        mongoose.Schema.apply(this, arguments);

        this.add({
          name: String,
          created_at: Date,
          minions: [new MinionSchema()]
        });
      };
      util.inherits(BaseSchema, mongoose.Schema);

      var PersonSchema = new BaseSchema();
      var BossSchema = new BaseSchema({
        department: String
      }, { id: false });

      // Should not throw
      var Person = db.model('gh2821', PersonSchema);
      Person.discriminator('gh2821-Boss', BossSchema);
      done();
    });

    describe('options', function() {
      it('allows toObject to be overridden', function(done) {
        assert.notDeepEqual(Employee.schema.get('toObject'), Person.schema.get('toObject'));
        assert.deepEqual(Employee.schema.get('toObject'), {getters: true, virtuals: false});
        done();
      });

      it('allows toJSON to be overridden', function(done) {
        assert.notDeepEqual(Employee.schema.get('toJSON'), Person.schema.get('toJSON'));
        assert.deepEqual(Employee.schema.get('toJSON'), {getters: false, virtuals: true});
        done();
      });

      it('is not customizable', function(done) {
        var CustomizedSchema = new Schema({}, {capped: true});

        assert.throws(function() {
          Person.discriminator('model-discriminator-custom', CustomizedSchema);
        }, /Can't customize discriminator option capped/);

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
        var FemaleSchema = new Schema({gender: {type: String, default: 'F'}}),
            Female = Person.discriminator('model-discriminator-female', FemaleSchema);

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
        assert.strictEqual(Employee.findByGender, PersonSchema.statics.findByGender);
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

      it('does not inherit indexes', function(done) {
        assert.deepEqual(Person.schema.indexes(), [[{name: 1}, {background: true}]]);
        assert.deepEqual(Employee.schema.indexes(), [[{department: 1}, {background: true}]]);
        done();
      });

      it('gets options overridden by root options except toJSON and toObject', function(done) {
        var personOptions = clone(Person.schema.options),
            employeeOptions = clone(Employee.schema.options);

        delete personOptions.toJSON;
        delete personOptions.toObject;
        delete employeeOptions.toJSON;
        delete employeeOptions.toObject;

        assert.deepEqual(personOptions, employeeOptions);
        done();
      });

      it('does not allow setting discriminator key (gh-2041)', function(done) {
        var doc = new Employee({ __t: 'fake' });
        assert.equal(doc.__t, 'model-discriminator-employee');
        doc.save(function(error) {
          assert.ok(error);
          assert.equal(error.errors['__t'].reason.message,
            'Can\'t set discriminator key "__t"');
          done();
        });
      });

      it('deduplicates hooks (gh-2945)', function() {
        let called = 0;
        function middleware(next) {
          ++called;
          next();
        }

        function ActivityBaseSchema() {
          mongoose.Schema.apply(this, arguments);
          this.options.discriminatorKey = 'type';
          this.add({ name: String });
          this.pre('validate', middleware);
        }
        util.inherits(ActivityBaseSchema, mongoose.Schema);

        const parentSchema = new ActivityBaseSchema();

        const model = db.model('gh2945', parentSchema);

        const commentSchema = new ActivityBaseSchema({
          text: { type: String, required: true }
        });

        const D = model.discriminator('gh2945_0', commentSchema);

        return new D({ text: 'test' }).validate().
          then(() => {
            assert.equal(called, 1);
          })
      });

      it('with typeKey (gh-4339)', function(done) {
        var options = { typeKey: '$type', discriminatorKey: '_t' };
        var schema = new Schema({ test: { $type: String } }, options);
        var Model = mongoose.model('gh4339', schema);
        Model.discriminator('gh4339_0', new Schema({
          test2: String
        }, { typeKey: '$type' }));
        done();
      });

      describe('applyPluginsToDiscriminators', function() {
        let m;

        beforeEach(function() {
          m = new mongoose.Mongoose();
          m.set('applyPluginsToDiscriminators', true);
        });

        it('works (gh-4965)', function(done) {
          var schema = new m.Schema({ test: String });
          var called = 0;
          m.plugin(function() {
            ++called;
          });
          var Model = m.model('gh4965', schema);
          var childSchema = new m.Schema({
            test2: String
          });
          Model.discriminator('gh4965_0', childSchema);
          assert.equal(called, 2);
  
          done();
        });

        it('works with customized options (gh-7458)', function() {
          m.plugin((schema) => {
            schema.options.versionKey = false;
            schema.options.minimize = false;
          });
          
          const schema = new m.Schema({
            type: {type: String},
            something: {type: String}
          }, {
            discriminatorKey: 'type'
          });
          const Model = m.model('Test', schema);
          
          const subSchema = new m.Schema({
            somethingElse: {type: String}
          });

          // Should not throw
          const SubModel = Model.discriminator('TestSub', subSchema);

          return Promise.resolve();
        });
      });

      it('cloning with discriminator key (gh-4387)', function(done) {
        var employee = new Employee({ name: { first: 'Val', last: 'Karpov' } });
        var clone = new employee.constructor(employee);

        // Should not error because we have the same discriminator key
        clone.save(function(error) {
          assert.ifError(error);
          done();
        });
      });

      it('embedded discriminators with array defaults (gh-7687)', function() {
        const abstractSchema = new Schema({}, {
          discriminatorKey: 'kind',
          _id: false
        });
        const concreteSchema = new Schema({ foo: { type: Number } });
        const defaultValue = [{ kind: 'concrete', foo: 42 }];

        const schema = new Schema({
          items: {
            type: [abstractSchema],
            default: defaultValue
          },
        });

        schema.path('items').discriminator('concrete', concreteSchema);

        const Thing = mongoose.model('Thing', schema);
        const doc = new Thing();

        assert.equal(doc.items[0].foo, 42);
        assert.equal(doc.items[0].constructor.name, 'concrete');

        return Promise.resolve();
      });

      it('embedded discriminators with create() (gh-5001)', function() {
        const eventSchema = new Schema({ message: String },
          { discriminatorKey: 'kind', _id: false });
        const batchSchema = new Schema({ events: [eventSchema] });
        const docArray = batchSchema.path('events');

        const Clicked = docArray.discriminator('Clicked', new Schema({
          element: {
            type: String,
            required: true
          }
        }, { _id: false }));

        const Purchased = docArray.discriminator('Purchased', new Schema({
          product: {
            type: String,
            required: true
          }
        }, { _id: false }));

        const Batch = db.model('EventBatch', batchSchema);

        const batch = {
          events: [
            { kind: 'Clicked', element: '#hero' }
          ]
        };

        return Batch.create(batch).
          then(function(doc) {
            assert.equal(doc.events.length, 1);
            const newDoc = doc.events.create({
              kind: 'Purchased',
              product: 'action-figure-1'
            });
            assert.equal(newDoc.kind, 'Purchased');
            assert.equal(newDoc.product, 'action-figure-1');
            assert.ok(newDoc instanceof Purchased);

            doc.events.push(newDoc);
            assert.equal(doc.events.length, 2);
            assert.equal(doc.events[1].kind, 'Purchased');
            assert.equal(doc.events[1].product, 'action-figure-1');
            assert.ok(newDoc instanceof Purchased);
            assert.ok(newDoc === doc.events[1]);
          });
      });

      it('embedded discriminator with numeric type (gh-7808)', function() {
        const typesSchema = Schema({
          type: { type: Number }
        }, { discriminatorKey:'type',_id:false });

        const mainSchema = Schema({
          types:[typesSchema]
        });

        mainSchema.path('types').discriminator(1,
          Schema({ foo: { type: String, default: 'bar' } }));
        mainSchema.path('types').discriminator(2,
          Schema({ hello: { type: String, default: 'world' } }));

        const Model = db.model('gh7808', mainSchema);

        return co(function*() {
          yield Model.create({
            types: [{ type: 1 }, { type: 2 }]
          });
          const fromDb = yield Model.collection.findOne();
          assert.equal(fromDb.types.length, 2);
          assert.equal(fromDb.types[0].foo, 'bar');
          assert.equal(fromDb.types[1].hello, 'world');
        });
      });

      it('supports clone() (gh-4983)', function(done) {
        var childSchema = new Schema({
          name: String
        });
        var childCalls = 0;
        var childValidateCalls = 0;
        var preValidate = function preValidate(next) {
          ++childValidateCalls;
          next();
        };
        childSchema.pre('validate', preValidate);
        childSchema.pre('save', function(next) {
          ++childCalls;
          next();
        });

        var personSchema = new Schema({
          name: String
        }, { discriminatorKey: 'kind' });

        var parentSchema = new Schema({
          children: [childSchema],
          heir: childSchema
        });
        var parentCalls = 0;
        parentSchema.pre('save', function(next) {
          ++parentCalls;
          next();
        });

        var Person = db.model('gh4983', personSchema);
        var Parent = Person.discriminator('gh4983_0', parentSchema.clone());

        var obj = {
          name: 'Ned Stark',
          heir: { name: 'Robb Stark' },
          children: [{ name: 'Jon Snow' }]
        };
        var doc = new Parent(obj);

        doc.save(function(error, doc) {
          assert.ifError(error);
          assert.equal(doc.name, 'Ned Stark');
          assert.equal(doc.heir.name, 'Robb Stark');
          assert.equal(doc.children.length, 1);
          assert.equal(doc.children[0].name, 'Jon Snow');
          assert.equal(childValidateCalls, 2);
          assert.equal(childCalls, 2);
          assert.equal(parentCalls, 1);
          done();
        });
      });

      it('clone() allows reusing schemas (gh-5098)', function(done) {
        var personSchema = new Schema({
          name: String
        }, { discriminatorKey: 'kind' });

        var parentSchema = new Schema({
          child: String
        });

        var Person = db.model('gh5098', personSchema);
        var Parent = Person.discriminator('gh5098_0', parentSchema.clone());
        // Should not throw
        var Parent2 = Person.discriminator('gh5098_1', parentSchema.clone());
        done();
      });

      it('clone() allows reusing with different models (gh-5721)', function(done) {
        var schema = new mongoose.Schema({
          name: String
        });

        var schemaExt = new mongoose.Schema({
          nameExt: String
        });

        var ModelA = db.model('gh5721_a0', schema);
        ModelA.discriminator('gh5721_a1', schemaExt);

        ModelA.findOneAndUpdate({}, { $set: { name: 'test' } }, function(error) {
          assert.ifError(error);

          var ModelB = db.model('gh5721_b0', schema.clone());
          ModelB.discriminator('gh5721_b1', schemaExt.clone());

          done();
        });
      });

      it('incorrect discriminator key throws readable error with create (gh-6434)', function() {
        return co(function*() {
          const settingSchema = new Schema({ name: String }, {
            discriminatorKey: 'kind'
          });

          const defaultAdvisorSchema = new Schema({
            _advisor: String
          });

          const Setting = db.model('gh6434_Setting', settingSchema);
          const DefaultAdvisor = Setting.discriminator('gh6434_DefaultAdvisor',
            defaultAdvisorSchema);

          let threw = false;
          try {
            yield Setting.create({
              kind: 'defaultAdvisor',
              name: 'xyz'
            });
          } catch (error) {
            threw = true;
            assert.equal(error.name, 'MongooseError');
            assert.equal(error.message, 'Discriminator "defaultAdvisor" not ' +
              'found for model "gh6434_Setting"');
          }
          assert.ok(threw);
        });
      });

      it('copies query hooks (gh-5147)', function(done) {
        var options = { discriminatorKey: 'kind' };

        var eventSchema = new mongoose.Schema({ time: Date }, options);
        var eventSchemaCalls = 0;
        eventSchema.pre('findOneAndUpdate', function() {
          ++eventSchemaCalls;
        });

        var Event = db.model('gh5147', eventSchema);

        var clickedEventSchema = new mongoose.Schema({ url: String }, options);
        var clickedEventSchemaCalls = 0;
        clickedEventSchema.pre('findOneAndUpdate', function() {
          ++clickedEventSchemaCalls;
        });
        var ClickedLinkEvent = Event.discriminator('gh5147_0', clickedEventSchema);

        ClickedLinkEvent.findOneAndUpdate({}, { time: new Date() }, {}).
          exec(function(error) {
            assert.ifError(error);
            assert.equal(eventSchemaCalls, 1);
            assert.equal(clickedEventSchemaCalls, 1);
            done();
          });
      });

      it('reusing schema for discriminators (gh-5684)', function(done) {
        var ParentSchema = new Schema({});
        var ChildSchema = new Schema({ name: String });

        var FirstContainerSchema = new Schema({
          stuff: [ParentSchema]
        });

        FirstContainerSchema.path('stuff').discriminator('Child', ChildSchema);

        var SecondContainerSchema = new Schema({
          things: [ParentSchema]
        });

        SecondContainerSchema.path('things').discriminator('Child', ChildSchema);

        var M1 = db.model('gh5684_0', FirstContainerSchema);
        var M2 = db.model('gh5684_1', SecondContainerSchema);

        var doc1 = new M1({ stuff: [{ __t: 'Child', name: 'test' }] });
        var doc2 = new M2({ things: [{ __t: 'Child', name: 'test' }] });

        assert.equal(doc1.stuff.length, 1);
        assert.equal(doc1.stuff[0].name, 'test');
        assert.equal(doc2.things.length, 1);
        assert.equal(doc2.things[0].name, 'test');

        done();
      });

      it('overwrites nested paths in parent schema (gh-6076)', function(done) {
        const schema = mongoose.Schema({
          account: {
            type: Object,
          }
        });

        const Model = db.model('gh6076', schema);

        const discSchema = mongoose.Schema({
          account: {
            user: {
              ref: 'Foo',
              required: true,
              type: mongoose.Schema.Types.ObjectId
            }
          }
        });

        const Disc = Model.discriminator('gh6076_0', discSchema);

        const d1 = new Disc({
          account: {
            user: 'AAAAAAAAAAAAAAAAAAAAAAAA',
          },
          info: 'AAAAAAAAAAAAAAAAAAAAAAAA',
        });

        // Should not throw
        assert.ifError(d1.validateSync());

        done();
      });

      it('nested discriminator key with projecting in parent (gh-5775)', function(done) {
        var itemSchema = new Schema({
          type: { type: String },
          active: { type: Boolean, default: true }
        }, { discriminatorKey: 'type' });

        var collectionSchema = new Schema({
          items: [itemSchema]
        });

        var s = new Schema({ count: Number });
        collectionSchema.path('items').discriminator('type1', s);

        var MyModel = db.model('Collection', collectionSchema);
        var doc = {
          items: [{ type: 'type1', active: false, count: 3 }]
        };
        MyModel.create(doc, function(error) {
          assert.ifError(error);
          MyModel.findOne({}).select('items').exec(function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.items.length, 1);
            assert.equal(doc.items[0].type, 'type1');
            assert.strictEqual(doc.items[0].active, false);
            assert.strictEqual(doc.items[0].count, 3);
            done();
          });
        });
      });

      it('with $meta projection (gh-5859)', function() {
        var eventSchema = new Schema({ eventField: String }, { id: false });
        var Event = db.model('gh5859', eventSchema);

        var trackSchema = new Schema({ trackField: String });
        var Track = Event.discriminator('gh5859_0', trackSchema);

        var trackedItem = new Track({
          trackField: 'trackField',
          eventField: 'eventField',
        });

        return trackedItem.save().
          then(function() {
            return Event.find({}).select({ score: { $meta: 'textScore' } });
          }).
          then(function(docs) {
            assert.equal(docs.length, 1);
            assert.equal(docs[0].trackField, 'trackField');
          }).
          then(function() {
            return Track.find({}).select({ score: { $meta: 'textScore' } });
          }).
          then(function(docs) {
            assert.equal(docs.length, 1);
            assert.equal(docs[0].trackField, 'trackField');
            assert.equal(docs[0].eventField, 'eventField');
          });
      });

      it('embedded discriminators with $push (gh-5009)', function(done) {
        var eventSchema = new Schema({ message: String },
          { discriminatorKey: 'kind', _id: false });
        var batchSchema = new Schema({ events: [eventSchema] });
        var docArray = batchSchema.path('events');

        var Clicked = docArray.discriminator('Clicked', new Schema({
          element: {
            type: String,
            required: true
          }
        }, { _id: false }));

        var Purchased = docArray.discriminator('Purchased', new Schema({
          product: {
            type: String,
            required: true
          }
        }, { _id: false }));

        var Batch = db.model('gh5009', batchSchema);

        var batch = {
          events: [
            { kind: 'Clicked', element: '#hero' }
          ]
        };

        Batch.create(batch).
          then(function(doc) {
            assert.equal(doc.events.length, 1);
            return Batch.updateOne({ _id: doc._id }, {
              $push: {
                events: { kind: 'Clicked', element: '#button' }
              }
            }).then(function() {
              return doc;
            });
          }).
          then(function(doc) {
            return Batch.findOne({ _id: doc._id });
          }).
          then(function(doc) {
            assert.equal(doc.events.length, 2);
            assert.equal(doc.events[1].element, '#button');
            assert.equal(doc.events[1].kind, 'Clicked');
            done();
          }).
          catch(done);
      });

      it('embedded discriminators with $push + $each (gh-5070)', function(done) {
        var eventSchema = new Schema({ message: String },
          { discriminatorKey: 'kind', _id: false });
        var batchSchema = new Schema({ events: [eventSchema] });
        var docArray = batchSchema.path('events');

        var Clicked = docArray.discriminator('Clicked', new Schema({
          element: {
            type: String,
            required: true
          }
        }, { _id: false }));

        var Purchased = docArray.discriminator('Purchased', new Schema({
          product: {
            type: String,
            required: true
          }
        }, { _id: false }));

        var Batch = db.model('gh5070', batchSchema);

        var batch = {
          events: [
            { kind: 'Clicked', element: '#hero' }
          ]
        };

        Batch.create(batch).
          then(function(doc) {
            assert.equal(doc.events.length, 1);
            return Batch.updateOne({ _id: doc._id }, {
              $push: {
                events: { $each: [{ kind: 'Clicked', element: '#button' }] }
              }
            }).then(function() {
              return doc;
            });
          }).
          then(function(doc) {
            return Batch.findOne({ _id: doc._id });
          }).
          then(function(doc) {
            assert.equal(doc.events.length, 2);
            assert.equal(doc.events[1].element, '#button');
            assert.equal(doc.events[1].kind, 'Clicked');
            done();
          }).
          catch(done);
      });

      it('embedded discriminators with $set (gh-5130)', function(done) {
        var eventSchema = new Schema({ message: String },
          { discriminatorKey: 'kind' });
        var batchSchema = new Schema({ events: [eventSchema] });
        var docArray = batchSchema.path('events');

        var Clicked = docArray.discriminator('Clicked', new Schema({
          element: {
            type: String,
            required: true
          }
        }));

        var Purchased = docArray.discriminator('Purchased', new Schema({
          product: {
            type: String,
            required: true
          }
        }));

        var Batch = db.model('gh5130', batchSchema);

        var batch = {
          events: [
            { kind: 'Clicked', element: '#hero' }
          ]
        };

        Batch.create(batch).
          then(function(doc) {
            assert.equal(doc.events.length, 1);
            return Batch.updateOne({ _id: doc._id, 'events._id': doc.events[0]._id }, {
              $set: {
                'events.$':  {
                  message: 'updated',
                  kind: 'Clicked',
                  element: '#hero2'
                }
              }
            }).then(function() { return doc; });
          }).
          then(function(doc) {
            return Batch.findOne({ _id: doc._id });
          }).
          then(function(doc) {
            assert.equal(doc.events.length, 1);
            assert.equal(doc.events[0].message, 'updated');
            assert.equal(doc.events[0].element, '#hero2');    // <-- test failed
            assert.equal(doc.events[0].kind, 'Clicked');      // <-- test failed
            done();
          }).
          catch(done);
      });

      it('embedded in document arrays (gh-2723)', function(done) {
        var eventSchema = new Schema({ message: String },
          { discriminatorKey: 'kind', _id: false });

        var batchSchema = new Schema({ events: [eventSchema] });
        batchSchema.path('events').discriminator('Clicked', new Schema({
          element: String
        }, { _id: false }));
        batchSchema.path('events').discriminator('Purchased', new Schema({
          product: String
        }, { _id: false }));

        var MyModel = db.model('gh2723', batchSchema);
        var doc = {
          events: [
            { kind: 'Clicked', element: 'Test' },
            { kind: 'Purchased', product: 'Test2' }
          ]
        };
        MyModel.create(doc).
          then(function(doc) {
            assert.equal(doc.events.length, 2);
            assert.equal(doc.events[0].element, 'Test');
            assert.equal(doc.events[1].product, 'Test2');
            var obj = doc.toObject({ virtuals: false });
            delete obj._id;
            assert.deepEqual(obj, {
              __v: 0,
              events: [
                { kind: 'Clicked', element: 'Test' },
                { kind: 'Purchased', product: 'Test2' }
              ]
            });
          }).
          then(function() {
            return MyModel.findOne({
              events: {
                $elemMatch: {
                  kind: 'Clicked',
                  element: 'Test'
                }
              }
            }, { 'events.$': 1 });
          }).
          then(function(doc) {
            assert.ok(doc);
            assert.equal(doc.events.length, 1);
            assert.equal(doc.events[0].element, 'Test');
            done();
          }).
          catch(done);
      });
    });

    it('embedded with single nested subdocs (gh-5244)', function(done) {
      var eventSchema = new Schema({ message: String },
        { discriminatorKey: 'kind', _id: false });

      var trackSchema = new Schema({ event: eventSchema });
      trackSchema.path('event').discriminator('Clicked', new Schema({
        element: String
      }, { _id: false }));
      trackSchema.path('event').discriminator('Purchased', new Schema({
        product: String
      }, { _id: false }));

      var MyModel = db.model('gh5244', trackSchema);
      var doc1 = {
        event: {
          kind: 'Clicked',
          element: 'Amazon Link'
        }
      };
      var doc2 = {
        event: {
          kind: 'Purchased',
          product: 'Professional AngularJS'
        }
      };
      MyModel.create([doc1, doc2]).
        then(function(docs) {
          var doc1 = docs[0];
          var doc2 = docs[1];

          assert.equal(doc1.event.kind, 'Clicked');
          assert.equal(doc1.event.element, 'Amazon Link');
          assert.ok(!doc1.event.product);

          assert.equal(doc2.event.kind, 'Purchased');
          assert.equal(doc2.event.product, 'Professional AngularJS');
          assert.ok(!doc2.event.element);
          done();
        }).
        catch(done);
    });

    it('embedded with single nested subdocs and tied value (gh-8164)', function() {
      const eventSchema = new Schema({ message: String },
        { discriminatorKey: 'kind', _id: false });

        const trackSchema = new Schema({ event: eventSchema });
      trackSchema.path('event').discriminator('Clicked', new Schema({
        element: String
      }, { _id: false }), 'click');
      trackSchema.path('event').discriminator('Purchased', new Schema({
        product: String
      }, { _id: false }), 'purchase');

      const MyModel = db.model('gh8164', trackSchema);
      const doc1 = {
        event: {
          kind: 'click',
          element: 'Amazon Link'
        }
      };
      const doc2 = {
        event: {
          kind: 'purchase',
          product: 'Professional AngularJS'
        }
      };
      return MyModel.create([doc1, doc2]).
        then(function(docs) {
          const doc1 = docs[0];
          const doc2 = docs[1];

          assert.equal(doc1.event.kind, 'click');
          assert.equal(doc1.event.element, 'Amazon Link');
          assert.ok(!doc1.event.product);

          assert.equal(doc2.event.kind, 'purchase');
          assert.equal(doc2.event.product, 'Professional AngularJS');
          assert.ok(!doc2.event.element);
        });
    });

    it('Embedded discriminators in nested doc arrays (gh-6202)', function() {
      const eventSchema = new Schema({ message: String }, {
        discriminatorKey: 'kind',
        _id: false
      });

      const batchSchema = new Schema({ events: [[eventSchema]] });
      const docArray = batchSchema.path('events');

      const clickedSchema = new Schema({
        element: {type: String, required: true}
      }, { _id: false });
      const Clicked = docArray.discriminator('Clicked', clickedSchema);

      const M = db.model('gh6202', batchSchema);

      return M.create({ events: [[{ kind: 'Clicked', element: 'foo' }]] }).
        then(() => M.findOne()).
        then(doc => {
          assert.deepEqual(doc.toObject().events[0][0], {
            kind: 'Clicked',
            element: 'foo'
          });
        });
    });

    it('throws an error if calling discriminator on non-doc array (gh-6202)', function() {
      const batchSchema = new Schema({ events: [[Number]] });
      const arr = batchSchema.path('events');

      const clickedSchema = new Schema({
        element: {type: String, required: true}
      }, { _id: false });

      let threw = false;
      try {
        arr.discriminator('Clicked', clickedSchema);
      } catch (error) {
        threw = true;
        assert.ok(error.message.indexOf('embedded discriminator') !== -1,
          error.message);
      }
      assert.ok(threw);
    });

    it('supports using a schema that was used for another discriminator (gh-7200)', function() {
      const schema = new Schema({
        name: String,
        names: [{
          name: String
        }]
      });

      const conA = mongoose.createConnection(start.uri);

      const schemaExt = new Schema({ nameExt: String });
      
      const modelA = conA.model('A', schema);
      modelA.discriminator('AExt', schemaExt);
      
      const conB = mongoose.createConnection(start.uri);
      
      const modelB = conB.model('A', schema);
      modelB.discriminator('AExt', schemaExt);
      
    });

    describe('embedded discriminators + hooks (gh-5706)', function(){
      var counters = {
        eventPreSave: 0,
        eventPostSave: 0,
        purchasePreSave: 0,
        purchasePostSave: 0,
        eventPreValidate: 0,
        eventPostValidate: 0,
        purchasePreValidate: 0,
        purchasePostValidate: 0,
      };
      var eventSchema = new Schema(
        { message: String },
        { discriminatorKey: 'kind', _id: false }
      );
      eventSchema.pre('validate', function(next) {
        counters.eventPreValidate++;
        next();
      });

      eventSchema.post('validate', function(doc) {
        counters.eventPostValidate++;
      });

      eventSchema.pre('save', function(next) {
        counters.eventPreSave++;
        next();
      });

      eventSchema.post('save', function(doc) {
        counters.eventPostSave++;
      });

      var purchasedSchema = new Schema({
        product: String,
      }, { _id: false });

      purchasedSchema.pre('validate', function(next) {
        counters.purchasePreValidate++;
        next();
      });

      purchasedSchema.post('validate', function(doc) {
        counters.purchasePostValidate++;
      });

      purchasedSchema.pre('save', function(next) {
        counters.purchasePreSave++;
        next();
      });

      purchasedSchema.post('save', function(doc) {
        counters.purchasePostSave++;
      });

      beforeEach(function() {
        Object.keys(counters).forEach(function(i) {
          counters[i] = 0;
        });
      });

      it('should call the hooks on the embedded document defined by both the parent and discriminated schemas', function(done){
        var trackSchema = new Schema({
          event: eventSchema,
        });

        var embeddedEventSchema = trackSchema.path('event');
        embeddedEventSchema.discriminator('Purchased', purchasedSchema.clone());

        var TrackModel = db.model('Track', trackSchema);
        var doc = new TrackModel({
          event: {
            message: 'Test',
            kind: 'Purchased'
          }
        });
        doc.save(function(err){
          assert.ok(!err);
          assert.equal(doc.event.message, 'Test')
          assert.equal(doc.event.kind, 'Purchased')
          Object.keys(counters).forEach(function(i) {
            assert.equal(counters[i], 1, 'Counter ' + i + ' incorrect');
          });
          done();
        });
      });

      it('should call the hooks on the embedded document in an embedded array defined by both the parent and discriminated schemas', function(done){
        var trackSchema = new Schema({
          events: [eventSchema],
        });

        var embeddedEventSchema = trackSchema.path('events');
        embeddedEventSchema.discriminator('Purchased', purchasedSchema.clone());

        var TrackModel = db.model('Track2', trackSchema);
        var doc = new TrackModel({
          events: [
            {
              message: 'Test',
              kind: 'Purchased'
            },
            {
              message: 'TestAgain',
              kind: 'Purchased'
            }
          ]
        });
        doc.save(function(err){
          assert.ok(!err);
          assert.equal(doc.events[0].kind, 'Purchased');
          assert.equal(doc.events[0].message, 'Test');
          assert.equal(doc.events[1].kind, 'Purchased');
          assert.equal(doc.events[1].message, 'TestAgain');
          Object.keys(counters).forEach(function(i) {
            assert.equal(counters[i], 2);
          });
          done();
        });
      });
    });

    it('should copy plugins', function () {
      const plugin = (schema) => { };

      const schema = new Schema({ value: String });
      schema.plugin(plugin);
      const model = mongoose.model('Model', schema);

      const discriminator = model.discriminator('Desc', new Schema({ anotherValue: String }));

      const copiedPlugin = discriminator.schema.plugins.find(p => p.fn === plugin);
      assert.ok(!!copiedPlugin);

      mongoose.deleteModel(/Model/);
    });

    describe('does not have unintended side effects', function() {
      // Delete every model
      afterEach(function() { mongoose.deleteModel(/.+/); });

      it('does not modify _id path of the passed in schema the _id is not auto generated (gh-8543)', function() {
        const model = mongoose.model('Model', new mongoose.Schema({ _id: Number }));
        const passedInSchema = new mongoose.Schema({});
        model.discriminator('Discrimintaor', passedInSchema);
        assert.equal(passedInSchema.path('_id').instance, 'Number');
      });

      function throwErrorOnClone() { throw new Error('clone() was called on the unrelated schema'); };

      it('when the base schema has an _id that is not auto generated (gh-8543) (gh-8546)', function() {
        const unrelatedSchema = new mongoose.Schema({});
        unrelatedSchema.clone = throwErrorOnClone;
        mongoose.model('UnrelatedModel', unrelatedSchema);

        const model = mongoose.model('Model', new mongoose.Schema({ _id: mongoose.Types.ObjectId }, { _id: false }));
        model.discriminator('Discrimintaor', new mongoose.Schema({}).clone());
      });
    });
  });

  describe('bug fixes', function() {
    it('discriminators with classes modifies class in place (gh-5175)', function(done) {
      class Vehicle extends mongoose.Model { }
      var V = mongoose.model(Vehicle, new mongoose.Schema());
      assert.ok(V === Vehicle);
      class Car extends Vehicle { }
      var C = Vehicle.discriminator(Car, new mongoose.Schema());
      assert.ok(C === Car);
      done();
    });

    it('allows overwriting base class methods (gh-5227)', function(done) {
      class BaseModel extends mongoose.Model {
        getString() {
          return 'parent';
        }
      }

      class GH5227 extends BaseModel {
        getString() {
          return 'child';
        }
      }

      const UserModel = mongoose.model(GH5227, new mongoose.Schema({}));

      const u = new UserModel({});

      assert.equal(u.getString(), 'child');

      done();
    });

    it('supports adding properties (gh-5104) (gh-5635)', function(done) {
      class Shape extends mongoose.Model { };
      class Circle extends Shape { };

      const ShapeModel = mongoose.model(Shape, new mongoose.Schema({
        color: String
      }));

      const CircleModel = ShapeModel.discriminator(Circle, new mongoose.Schema({
        radius: Number
      }));

      const circle = new Circle({ color: 'blue', radius: 3 });
      assert.equal(circle.color, 'blue');
      assert.equal(circle.radius, 3);

      done();
    });

    it('with subclassing (gh-7547)', function() {
      const options = { discriminatorKey: "kind" };

      const eventSchema = new mongoose.Schema({ time: Date }, options);
      const eventModelUser1 =
        mongoose.model('gh7547_Event', eventSchema, 'user1_events');
      const eventModelUser2 =
        mongoose.model('gh7547_Event', eventSchema, 'user2_events');

      const discSchema = new mongoose.Schema({ url: String }, options);
      const clickEventUser1 = eventModelUser1.
        discriminator('gh7547_ClickedEvent', discSchema);
      const clickEventUser2 =
        eventModelUser2.discriminators['gh7547_ClickedEvent'];

      assert.equal(clickEventUser1.collection.name, 'user1_events');
      assert.equal(clickEventUser2.collection.name, 'user2_events');
    });

    it('uses correct discriminator when using `new BaseModel` (gh-7586)', function() {
      const options = { discriminatorKey: 'kind' };

      const BaseModel = mongoose.model('gh7586_Base',
        Schema({ name: String }, options));
      const ChildModel = BaseModel.discriminator('gh7586_Child',
        Schema({ test: String }, options));

      const doc = new BaseModel({ kind: 'gh7586_Child', name: 'a', test: 'b' });
      assert.ok(doc instanceof ChildModel);
      assert.equal(doc.test, 'b');
    });

    it('uses correct discriminator when using `new BaseModel` with value (gh-7851)', function() {
      const options = { discriminatorKey: 'kind' };

      const BaseModel = mongoose.model('gh7851_Base',
        Schema({ name: String }, options));
      const ChildModel = BaseModel.discriminator('gh7851_Child',
        Schema({ test: String }, options), 'child');

      const doc = new BaseModel({ kind: 'child', name: 'a', test: 'b' });
      assert.ok(doc instanceof ChildModel);
      assert.equal(doc.test, 'b');
    });

    it('allows setting custom discriminator key in schema (gh-7807)', function() {
      const eventSchema = Schema({
        title: String,
        kind: { type: String, required: true }
      }, { discriminatorKey: 'kind' });
      
      const Event = db.model('gh7807', eventSchema);
      const Clicked = Event.discriminator('gh7807_Clicked',
        Schema({ url: String }));

      const doc = new Event({ title: 'foo' });

      return doc.validate().then(() => assert.ok(false), err => {
        assert.ok(err);
        assert.ok(err.errors['kind']);
        assert.ok(err.errors['kind'].message.indexOf('required') !== -1,
          err.errors['kind'].message);
      });
    });

    it('does not project in embedded discriminator key if it is the only selected field (gh-7574)', function() {
      const sectionSchema = Schema({ title: String }, { discriminatorKey: 'kind' });
      const imageSectionSchema = Schema({ href: String });
      const textSectionSchema = Schema({ text: String });

      const documentSchema = Schema({
        title: String,
        sections: [ sectionSchema ]
      });

      const sectionsType = documentSchema.path('sections');
      sectionsType.discriminator('image', imageSectionSchema);
      sectionsType.discriminator('text', textSectionSchema);

      const Model = db.model('gh7574', documentSchema);

      return co(function*() {
        yield Model.create({
          title: 'example',
          sections: [
            { kind: 'image', title: 'image', href: 'foo' },
            { kind: 'text', title: 'text', text: 'bar' }
          ]
        });

        let doc = yield Model.findOne({}).select('title');
        assert.ok(!doc.sections);

        doc = yield Model.findOne({}).select('title sections.title');
        assert.ok(doc.sections);
        assert.equal(doc.sections[0].kind, 'image');
        assert.equal(doc.sections[1].kind, 'text');
      });
    });

    it('merges schemas instead of overwriting (gh-7884)', function() {
      const opts = { discriminatorKey: 'kind' };

      const eventSchema = Schema({ lookups: [{ name: String }] }, opts);
      const Event = db.model('gh7884_event', eventSchema);

      const ClickedLinkEvent = Event.discriminator('gh7844_clicked', Schema({
        lookups: [{ hi: String }],
        url: String
      }, opts));

      const e = new ClickedLinkEvent({
        lookups: [{
          hi: 'address1',
          name: 'address2',
        }],
        url: 'google.com'
      });
      assert.equal(e.lookups.length, 1);
      assert.equal(e.lookups[0].hi, 'address1');
      assert.equal(e.get('lookups.0.name'), 'address2');
      assert.equal(e.lookups[0].name, 'address2');
    });

    it('_id: false in discriminator nested schema (gh-8274)', function() {
      const schema = new Schema({
        operations: {
          type: [{ _id: Number, action: String }]
        }
      });
      schema.path('operations').discriminator('gh8274_test', new Schema({
        pitchPath: Schema({
          _id: Number,
          path: [{ _id: false, x: Number, y: Number }]
        })
      }));
      const Model = db.model('gh8274', schema);

      const doc = new Model();
      doc.operations.push({
        _id: 42,
        __t: 'gh8274_test',
        pitchPath: { path: [{ x: 1, y: 2 }] }
      });
      assert.strictEqual(doc.operations[0].pitchPath.path[0]._id, void 0);
    });

    it('with discriminators in embedded arrays (gh-8273)', function(done) {
      const ProductSchema = new Schema({
        title: String
      });
      const Product = mongoose.model('gh8273_Product', ProductSchema);
      const ProductItemSchema = new Schema({
        product: { type: Schema.Types.ObjectId, ref: 'gh8273_Product' }
      });

      const OrderItemSchema = new Schema({}, {discriminatorKey: '__t'});

      const OrderSchema = new Schema({
        items: [OrderItemSchema],
      });

      OrderSchema.path('items').discriminator('ProductItem', ProductItemSchema);
      const Order = mongoose.model('Order', OrderSchema);

      const product = new Product({title: 'Product title'});

      const order = new Order({
        items: [{
          __t: 'ProductItem',
          product: product
        }]
      });
      assert.ok(order.items[0].product.title);
      assert.equal(order.populated('items.product').length, 1);

      done();
    });
  });
});
