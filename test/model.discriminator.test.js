/**
 * Test dependencies.
 */

var start = require('./common'),
    mongoose = start.mongoose,
    Schema = mongoose.Schema,
    assert = require('power-assert'),
    util = require('util'),
    clone = require('../lib/utils').clone,
    random = require('../lib/utils').random;

/**
 * Setup
 */
var PersonSchema = new Schema({
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
  describe('discriminator()', function() {
    var db, Person, Employee;

    before(function() {
      db = start();
      Person = db.model('model-discriminator-person', PersonSchema);
      Employee = Person.discriminator('model-discriminator-employee', EmployeeSchema);
    });

    after(function(done) {
      db.close(done);
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
      assert.deepEqual(PersonSchema.discriminatorMapping, {key: '__t', value: null, isRoot: true});
      done();
    });

    it('sets schema discriminator type mapping', function(done) {
      assert.deepEqual(EmployeeSchema.discriminatorMapping, {key: '__t', value: 'model-discriminator-employee', isRoot: false});
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
        assert.equal(Employee.schema.callQueue.length, 7);

        // EmployeeSchema.pre('save')
        var queueIndex = Employee.schema.callQueue.length - 1;
        assert.strictEqual(Employee.schema.callQueue[queueIndex][0], 'pre');
        assert.strictEqual(Employee.schema.callQueue[queueIndex][1]['0'], 'save');
        assert.strictEqual(Employee.schema.callQueue[queueIndex][1]['1'], employeeSchemaPreSaveFn);
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

      it('with typeKey (gh-4339)', function(done) {
        var options = { typeKey: '$type', discriminatorKey: '_t' };
        var schema = new Schema({ test: { $type: String } }, options);
        var Model = mongoose.model('gh4339', schema);
        Model.discriminator('gh4339_0', new Schema({
          test2: String
        }, { typeKey: '$type' }));
        done();
      });

      it('applyPluginsToDiscriminators (gh-4965)', function(done) {
        var schema = new Schema({ test: String });
        mongoose.set('applyPluginsToDiscriminators', true);
        var called = 0;
        mongoose.plugin(function() {
          ++called;
        });
        var Model = mongoose.model('gh4965', schema);
        var childSchema = new Schema({
          test2: String
        });
        Model.discriminator('gh4965_0', childSchema);
        assert.equal(called, 2);

        mongoose.plugins = [];
        mongoose.set('applyPluginsToDiscriminators', false);
        done();
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

      it('embedded discriminators with create() (gh-5001)', function(done) {
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

        var Batch = db.model('EventBatch', batchSchema);

        var batch = {
          events: [
            { kind: 'Clicked', element: '#hero' }
          ]
        };

        Batch.create(batch).
          then(function(doc) {
            assert.equal(doc.events.length, 1);
            var newDoc = doc.events.create({
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

            done();
          }).
          catch(done);
      });

      it('supports clone() (gh-4983)', function(done) {
        var childSchema = new Schema({
          name: String
        });
        var childCalls = 0;
        var childValidateCalls = 0;
        childSchema.pre('validate', function(next) {
          ++childValidateCalls;
          next();
        });
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
        Parent.create(obj, function(error, doc) {
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
            done();
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
  });
});
