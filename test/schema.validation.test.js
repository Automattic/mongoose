'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const Promise = require('bluebird');
const assert = require('assert');
const random = require('../lib/utils').random;

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ValidatorError = mongoose.Error.ValidatorError;
const SchemaTypes = Schema.Types;
const ObjectId = SchemaTypes.ObjectId;
const Mixed = SchemaTypes.Mixed;
const DocumentObjectId = mongoose.Types.ObjectId;

describe('schema', function() {
  describe('validation', function() {
    it('invalid arguments are rejected (1044)', function(done) {
      assert.throws(function() {
        new Schema({
          simple: {type: String, validate: 'nope'}
        });
      }, /Invalid validator/);

      assert.throws(function() {
        new Schema({
          simple: {type: String, validate: ['nope']}
        });
      }, /Invalid validator/);

      assert.throws(function() {
        new Schema({
          simple: {type: String, validate: {nope: 1, msg: 'nope'}}
        });
      }, /Invalid validator/);

      assert.throws(function() {
        new Schema({
          simple: {type: String, validate: [{nope: 1, msg: 'nope'}, 'nope']}
        });
      }, /Invalid validator/);

      done();
    });

    it('string enum', function(done) {
      const Test = new Schema({
        complex: {type: String, enum: ['a', 'b', undefined, 'c', null]},
        state: {type: String}
      });

      assert.ok(Test.path('complex') instanceof SchemaTypes.String);
      assert.deepEqual(Test.path('complex').enumValues, ['a', 'b', 'c', null]);
      assert.equal(Test.path('complex').validators.length, 1);

      Test.path('complex').enum('d', 'e');

      assert.deepEqual(Test.path('complex').enumValues, ['a', 'b', 'c', null, 'd', 'e']);

      // with SchemaTypes validate method
      Test.path('state').enum({
        values: 'opening open closing closed'.split(' '),
        message: 'enum validator failed for path `{PATH}`: test'
      });

      assert.equal(Test.path('state').validators.length, 1);
      assert.deepEqual(Test.path('state').enumValues, ['opening', 'open', 'closing', 'closed']);

      Test.path('complex').doValidate('x', function(err) {
        assert.ok(err instanceof ValidatorError);
      });

      // allow unsetting enums
      Test.path('complex').doValidate(undefined, function(err) {
        assert.ifError(err);
      });

      Test.path('complex').doValidate(null, function(err) {
        assert.ifError(err);
      });

      Test.path('complex').doValidate('da', function(err) {
        assert.ok(err instanceof ValidatorError);
      });

      Test.path('state').doValidate('x', function(err) {
        assert.ok(err instanceof ValidatorError);
        assert.equal(err.message,
          'enum validator failed for path `state`: test');
      });

      Test.path('state').doValidate('opening', function(err) {
        assert.ifError(err);
      });

      Test.path('state').doValidate('open', function(err) {
        assert.ifError(err);
      });

      done();
    });

    it('string regexp', function(done) {
      const Test = new Schema({
        simple: {type: String, match: /[a-z]/}
      });

      assert.equal(Test.path('simple').validators.length, 1);

      Test.path('simple').doValidate('az', function(err) {
        assert.ifError(err);
      });

      Test.path('simple').match(/[0-9]/);
      assert.equal(Test.path('simple').validators.length, 2);

      Test.path('simple').doValidate('12', function(err) {
        assert.ok(err instanceof ValidatorError);
      });

      Test.path('simple').doValidate('a12', function(err) {
        assert.ifError(err);
      });

      Test.path('simple').doValidate('', function(err) {
        assert.ifError(err);
      });
      Test.path('simple').doValidate(null, function(err) {
        assert.ifError(err);
      });
      Test.path('simple').doValidate(undefined, function(err) {
        assert.ifError(err);
      });
      Test.path('simple').validators = [];
      Test.path('simple').match(/[1-9]/);
      Test.path('simple').doValidate(0, function(err) {
        assert.ok(err instanceof ValidatorError);
      });

      Test.path('simple').match(null);
      Test.path('simple').doValidate(0, function(err) {
        assert.ok(err instanceof ValidatorError);
      });

      done();
    });

    describe('non-required fields', function() {
      describe('are validated correctly', function() {
        let db;
        let Person;

        before(function() {
          db = start();
          const PersonSchema = new Schema({
            name: {type: String},
            num_cars: {type: Number, min: 20}
          });
          Person = db.model('person-schema-validation-test', PersonSchema);
        });

        after(function(done) {
          db.close(done);
        });

        it('and can be set to "undefined" (gh-1594)', function(done) {
          const p = new Person({name: 'Daniel'});
          p.num_cars = 25;

          p.save(function(err) {
            assert.ifError(err);
            assert.equal(p.num_cars, 25);
            p.num_cars = undefined;

            p.save(function(err) {
              assert.ifError(err);
              assert.equal(p.num_cars, undefined);
              p.num_cars = 5;

              p.save(function(err) {
                // validation should still work for non-undefined values
                assert.ok(err);
                done();
              });
            });
          });
        });
      });

      it('number min and max', function(done) {
        const Tobi = new Schema({
          friends: {type: Number, max: 15, min: 5}
        });

        assert.equal(Tobi.path('friends').validators.length, 2);

        Tobi.path('friends').doValidate(10, function(err) {
          assert.ifError(err);
        });

        Tobi.path('friends').doValidate(100, function(err) {
          assert.ok(err instanceof ValidatorError);
          assert.equal(err.path, 'friends');
          assert.equal(err.kind, 'max');
          assert.equal(err.value, 100);
        });

        Tobi.path('friends').doValidate(1, function(err) {
          assert.ok(err instanceof ValidatorError);
          assert.equal(err.path, 'friends');
          assert.equal(err.kind, 'min');
        });

        // null is allowed
        Tobi.path('friends').doValidate(null, function(err) {
          assert.ifError(err);
        });

        Tobi.path('friends').min();
        Tobi.path('friends').max();

        assert.equal(Tobi.path('friends').validators.length, 0);
        done();
      });
    });

    describe('required', function() {
      it('string required', function(done) {
        const Test = new Schema({
          simple: String
        });

        Test.path('simple').required(true);
        assert.equal(Test.path('simple').validators.length, 1);

        Test.path('simple').doValidate(null, function(err) {
          assert.ok(err instanceof ValidatorError);
        });

        Test.path('simple').doValidate(undefined, function(err) {
          assert.ok(err instanceof ValidatorError);
        });

        Test.path('simple').doValidate('', function(err) {
          assert.ok(err instanceof ValidatorError);
        });

        Test.path('simple').doValidate('woot', function(err) {
          assert.ifError(err);
        });

        done();
      });

      it('string conditional required', function(done) {
        const Test = new Schema({
          simple: String
        });

        let required = true;
        const isRequired = function() {
          return required;
        };

        Test.path('simple').required(isRequired);
        assert.equal(Test.path('simple').validators.length, 1);

        Test.path('simple').doValidate(null, function(err) {
          assert.ok(err instanceof ValidatorError);
        });

        Test.path('simple').doValidate(undefined, function(err) {
          assert.ok(err instanceof ValidatorError);
        });

        Test.path('simple').doValidate('', function(err) {
          assert.ok(err instanceof ValidatorError);
        });

        Test.path('simple').doValidate('woot', function(err) {
          assert.ifError(err);
        });

        required = false;

        Test.path('simple').doValidate(null, function(err) {
          assert.ifError(err);
        });

        Test.path('simple').doValidate(undefined, function(err) {
          assert.ifError(err);
        });

        Test.path('simple').doValidate('', function(err) {
          assert.ifError(err);
        });

        Test.path('simple').doValidate('woot', function(err) {
          assert.ifError(err);
        });

        done();
      });

      it('number required', function(done) {
        const Edwald = new Schema({
          friends: {type: Number, required: true}
        });

        Edwald.path('friends').doValidate(null, function(err) {
          assert.ok(err instanceof ValidatorError);
        });

        Edwald.path('friends').doValidate(undefined, function(err) {
          assert.ok(err instanceof ValidatorError);
        });

        Edwald.path('friends').doValidate(0, function(err) {
          assert.ifError(err);
        });

        done();
      });

      it('date required', function(done) {
        const Loki = new Schema({
          birth_date: {type: Date, required: true}
        });

        Loki.path('birth_date').doValidate(null, function(err) {
          assert.ok(err instanceof ValidatorError);
        });

        Loki.path('birth_date').doValidate(undefined, function(err) {
          assert.ok(err instanceof ValidatorError);
        });

        Loki.path('birth_date').doValidate(new Date(), function(err) {
          assert.ifError(err);
        });

        done();
      });

      it('date not empty string (gh-3132)', function(done) {
        const HappyBirthday = new Schema({
          date: {type: Date, required: true}
        });

        HappyBirthday.path('date').doValidate('', function(err) {
          assert.ok(err instanceof ValidatorError);
          done();
        });
      });

      it('objectid required', function(done) {
        const Loki = new Schema({
          owner: {type: ObjectId, required: true}
        });

        Loki.path('owner').doValidate(new DocumentObjectId(), function(err) {
          assert.ifError(err);
        });

        Loki.path('owner').doValidate(null, function(err) {
          assert.ok(err instanceof ValidatorError);
        });

        Loki.path('owner').doValidate(undefined, function(err) {
          assert.ok(err instanceof ValidatorError);
        });
        done();
      });

      it('array required', function(done) {
        const Loki = new Schema({
          likes: {type: Array, required: true}
        });

        let remaining = 2;

        Loki.path('likes').doValidate(null, function(err) {
          assert.ok(err instanceof ValidatorError);
          --remaining || done();
        });

        Loki.path('likes').doValidate(undefined, function(err) {
          assert.ok(err instanceof ValidatorError);
          --remaining || done();
        });
      });

      it('array required custom required', function(done) {
        const requiredOrig = mongoose.Schema.Types.Array.checkRequired();
        mongoose.Schema.Types.Array.checkRequired(v => Array.isArray(v) && v.length);
        const doneWrapper = (err) => {
          mongoose.Schema.Types.Array.checkRequired(requiredOrig);
          done(err);
        };

        const Loki = new Schema({
          likes: {type: Array, required: true}
        });

        let remaining = 2;

        Loki.path('likes').doValidate([], function(err) {
          assert.ok(err instanceof ValidatorError);
          --remaining || doneWrapper();
        });

        Loki.path('likes').doValidate(['cake'], function(err) {
          assert(!err);
          --remaining || doneWrapper();
        });
      });

      it('boolean required', function(done) {
        const Animal = new Schema({
          isFerret: {type: Boolean, required: true}
        });

        let remaining = 4;

        Animal.path('isFerret').doValidate(null, function(err) {
          assert.ok(err instanceof ValidatorError);
          --remaining || done();
        });

        Animal.path('isFerret').doValidate(undefined, function(err) {
          assert.ok(err instanceof ValidatorError);
          --remaining || done();
        });

        Animal.path('isFerret').doValidate(true, function(err) {
          assert.ifError(err);
          --remaining || done();
        });

        Animal.path('isFerret').doValidate(false, function(err) {
          assert.ifError(err);
          --remaining || done();
        });
      });

      it('mixed required', function(done) {
        const Animal = new Schema({
          characteristics: {type: Mixed, required: true}
        });

        let remaining = 4;

        Animal.path('characteristics').doValidate(null, function(err) {
          assert.ok(err instanceof ValidatorError);
          --remaining || done();
        });

        Animal.path('characteristics').doValidate(undefined, function(err) {
          assert.ok(err instanceof ValidatorError);
          --remaining || done();
        });

        Animal.path('characteristics').doValidate({
          aggresive: true
        }, function(err) {
          assert.ifError(err);
          --remaining || done();
        });

        Animal.path('characteristics').doValidate('none available', function(err) {
          assert.ifError(err);
          --remaining || done();
        });
      });
    });

    describe('async', function() {
      it('works', function(done) {
        let executed = 0;

        function validator(value) {
          return new global.Promise(function(resolve) {
            setTimeout(function() {
              executed++;
              resolve(value === true);
              if (executed === 2) {
                done();
              }
            }, 5);
          });
        }

        const Animal = new Schema({
          ferret: {type: Boolean, validate: validator}
        });

        Animal.path('ferret').doValidate(true, function(err) {
          assert.ifError(err);
        });

        Animal.path('ferret').doValidate(false, function(err) {
          assert.ok(err instanceof Error);
        });
      });

      it('multiple sequence', function(done) {
        let validator1Executed = false;
        let validator2Executed = false;

        function validator1(value, fn) {
          setTimeout(function() {
            validator1Executed = true;
            assert.ok(!validator2Executed);
            fn(value === true);
          }, 5);
        }

        function validator2(value, fn) {
          setTimeout(function() {
            validator2Executed = true;
            assert.ok(validator1Executed);
            fn(value === true);
            done();
          }, 5);
        }

        const Animal = new Schema({
          ferret: {
            type: Boolean,
            validate: [
              { validator: validator1, msg: 'validator1' },
              { validator: validator2, msg: 'validator2' }
            ].map(function(v) { return Object.assign(v, { isAsync: true }); })
          }
        });

        Animal.path('ferret').doValidate(true, function(err) {
          assert.ifError(err);
        });
      });

      it('scope', function(done) {
        let called = false;

        function validator() {
          return new global.Promise(resolve => {
            assert.equal(this.a, 'b');
            setTimeout(function() {
              called = true;
              resolve(true);
            }, 5);
          });
        }

        const Animal = new Schema({
          ferret: {
            type: Boolean,
            validate: validator
          }
        });

        Animal.path('ferret').doValidate(true, function(err) {
          assert.ifError(err);
          assert.equal(called, true);
          done();
        }, {a: 'b'});
      });
    });

    describe('messages', function() {
      describe('are customizable', function() {
        it('within schema definitions', function(done) {
          const schema = new Schema({
            name: {type: String, enum: ['one', 'two']},
            myenum: {type: String, enum: {values: ['x'], message: 'enum validator failed for path: {PATH} with {VALUE}'}},
            requiredString1: {type: String, required: true},
            requiredString2: {type: String, required: 'oops, {PATH} is missing. {TYPE}'},
            matchString0: {type: String, match: /bryancranston/},
            matchString1: {type: String, match: [/bryancranston/, 'invalid string for {PATH} with value: {VALUE}']},
            numMin0: {type: Number, min: 10},
            numMin1: {type: Number, min: [10, 'hey, {PATH} is too small']},
            numMax0: {type: Number, max: 20},
            numMax1: {type: Number, max: [20, 'hey, {PATH} ({VALUE}) is greater than {MAX}']}
          });

          const A = mongoose.model('schema-validation-messages-' + random(), schema);

          const a = new A;
          a.validate(function(err) {
            assert.equal(err.errors.requiredString1, 'Path `requiredString1` is required.');
            assert.equal(err.errors.requiredString2, 'oops, requiredString2 is missing. required');

            a.requiredString1 = a.requiredString2 = 'hi';
            a.name = 'three';
            a.myenum = 'y';
            a.matchString0 = a.matchString1 = 'no match';
            a.numMin0 = a.numMin1 = 2;
            a.numMax0 = a.numMax1 = 30;

            a.validate(function(err) {
              assert.equal(err.errors.name, '`three` is not a valid enum value for path `name`.');
              assert.equal(err.errors.myenum, 'enum validator failed for path: myenum with y');
              assert.equal(err.errors.matchString0, 'Path `matchString0` is invalid (no match).');
              assert.equal(err.errors.matchString1, 'invalid string for matchString1 with value: no match');
              assert.equal(String(err.errors.numMin0), 'Path `numMin0` (2) is less than minimum allowed value (10).');
              assert.equal(String(err.errors.numMin1), 'hey, numMin1 is too small');
              assert.equal(err.errors.numMax0, 'Path `numMax0` (30) is more than maximum allowed value (20).');
              assert.equal(String(err.errors.numMax1), 'hey, numMax1 (30) is greater than 20');

              a.name = 'one';
              a.myenum = 'x';
              a.requiredString1 = 'fixed';
              a.matchString1 = a.matchString0 = 'bryancranston is an actor';
              a.numMin0 = a.numMax0 = a.numMin1 = a.numMax1 = 15;
              a.validate(done);
            });
          });
        });

        it('for custom validators', function(done) {
          const validate = function() {
            return false;
          };
          const validator = [validate, '{PATH} failed validation ({VALUE})'];

          const schema = new Schema({x: {type: [], validate: validator}});
          const M = mongoose.model('custom-validator-' + random(), schema);

          const m = new M({x: [3, 4, 5, 6]});

          m.validate(function(err) {
            assert.equal(String(err.errors.x), 'x failed validation (3,4,5,6)');
            assert.equal(err.errors.x.kind, 'user defined');
            done();
          });
        });

        it('custom validators with isAsync = false', function(done) {
          const validate = function(v, opts) {
            // Make eslint not complain about unused vars
            return !!(v && opts && false);
          };

          const schema = new Schema({
            x: {
              type: String,
              validate: {
                isAsync: false,
                validator: validate
              }
            }
          });
          const M = mongoose.model('custom-validator-async-' + random(), schema);

          const m = new M({x: 'test'});

          m.validate(function(err) {
            assert.ok(err.errors['x']);
            done();
          });
        });

        it('custom validators with isAsync and .validate() (gh-5125)', function(done) {
          const validate = function(v, opts) {
            // Make eslint not complain about unused vars
            return !!(v && opts && false);
          };

          const schema = new Schema({
            x: {
              type: String
            }
          });

          schema.path('x').validate({
            isAsync: false,
            validator: validate,
            message: 'Custom error message!'
          });
          const M = mongoose.model('gh5125', schema);

          const m = new M({x: 'test'});

          m.validate(function(err) {
            assert.ok(err.errors['x']);
            assert.equal(err.errors['x'].message, 'Custom error message!');
            done();
          });
        });

        it('custom validators with isAsync and promise (gh-5171)', function(done) {
          const validate = function(v) {
            return Promise.resolve(v === 'test');
          };

          const schema = new Schema({
            x: {
              type: String
            }
          });

          schema.path('x').validate({
            isAsync: true,
            validator: validate
          });
          const M = mongoose.model('gh5171', schema);

          const m = new M({x: 'not test'});

          m.validate(function(err) {
            assert.ok(err.errors['x']);
            done();
          });
        });

        it('supports custom properties (gh-2132)', function(done) {
          const schema = new Schema({
            x: {
              type: String,
              validate: [{
                validator: function() {
                  return false;
                },
                msg: 'Error code {ERRORCODE}',
                errorCode: 25
              }]
            }
          });
          const M = mongoose.model('gh-2132', schema, 'gh-2132');

          const m = new M({x: 'a'});
          m.validate(function(err) {
            assert.equal(err.errors.x.toString(), 'Error code 25');
            assert.equal(err.errors.x.properties.message, 'Error code 25');
            assert.equal(err.errors.x.properties.errorCode, 25);
            done();
          });
        });

        it('supports dynamic message for validators with callback (gh-1936)', function(done) {
          const schema = new Schema({
            x: {
              type: String,
              validate: [{
                validator: function() {
                  throw new Error('Custom message');
                },
                msg: 'Does not matter'
              }]
            }
          });
          const M = mongoose.model('gh-1936', schema, 'gh-1936');

          const m = new M({x: 'whatever'});
          m.validate(function(err) {
            assert.equal(err.errors.x.toString(), 'Custom message');
            done();
          });
        });
      });
    });

    describe('types', function() {
      describe('are customizable', function() {
        it('for single custom validators', function(done) {
          function validate() {
            return false;
          }

          const validator = [validate, '{PATH} failed validation ({VALUE})', 'customType'];

          const schema = new Schema({x: {type: [], validate: validator}});
          const M = mongoose.model('custom-validator-' + random(), schema);

          const m = new M({x: [3, 4, 5, 6]});

          m.validate(function(err) {
            assert.equal(String(err.errors.x), 'x failed validation (3,4,5,6)');
            assert.equal(err.errors.x.properties.message, 'x failed validation (3,4,5,6)');
            assert.equal(err.errors.x.kind, 'customType');
            done();
          });
        });

        it('for many custom validators', function(done) {
          function validate() {
            return false;
          }

          const validator = [
            {validator: validate, msg: '{PATH} failed validation ({VALUE})', type: 'customType'}
          ];
          const schema = new Schema({x: {type: [], validate: validator}});
          const M = mongoose.model('custom-validator-' + random(), schema);

          const m = new M({x: [3, 4, 5, 6]});

          m.validate(function(err) {
            assert.equal(String(err.errors.x), 'x failed validation (3,4,5,6)');
            assert.equal(err.errors.x.kind, 'customType');
            done();
          });
        });
      });
    });

    it('should clear validator errors (gh-2302)', function(done) {
      const userSchema = new Schema({name: {type: String, required: true}});
      const User = mongoose.model('gh-2302', userSchema, 'gh-2302');

      const user = new User();
      user.validate(function(err) {
        assert.ok(err);
        assert.ok(user.errors);
        assert.ok(user.errors.name);
        user.name = 'bacon';
        user.validate(function(err) {
          assert.ok(!err);
          assert.ok(!user.$__.validationError);
          done();
        });
      });
    });

    it('should allow an array of enums (gh-661)', function(done) {
      const validBreakfastFoods = ['bacon', 'eggs', 'steak', 'coffee', 'butter'];
      const breakfastSchema = new Schema({
        foods: [{type: String, enum: validBreakfastFoods}]
      });
      const Breakfast = mongoose.model('gh-661', breakfastSchema, 'gh-661');

      const goodBreakfast = new Breakfast({foods: ['eggs', 'bacon']});
      goodBreakfast.validate(function(error) {
        assert.ifError(error);

        const badBreakfast = new Breakfast({foods: ['tofu', 'waffles', 'coffee']});
        badBreakfast.validate(function(error) {
          assert.ok(error);
          assert.ok(error.errors['foods.0']);
          assert.equal(error.errors['foods.0'].message,
            '`tofu` is not a valid enum value for path `foods.0`.');
          assert.ok(error.errors['foods.1']);
          assert.equal(error.errors['foods.1'].message,
            '`waffles` is not a valid enum value for path `foods.1`.');
          assert.ok(!error.errors['foods.2']);

          done();
        });
      });
    });

    it('should allow an array of subdocuments with enums (gh-3521)', function(done) {
      const coolSchema = new Schema({
        votes: [{
          vote: {type: String, enum: ['cool', 'not-cool']}
        }]
      });
      const Cool = mongoose.model('gh-3521', coolSchema, 'gh-3521');

      const cool = new Cool();
      cool.votes.push(cool.votes.create({
        vote: 'cool'
      }));
      cool.validate(function(error) {
        assert.ifError(error);

        const terrible = new Cool();
        terrible.votes.push(terrible.votes.create({
          vote: 'terrible'
        }));

        terrible.validate(function(error) {
          assert.ok(error);
          assert.ok(error.errors['votes.0.vote']);
          assert.equal(error.errors['votes.0.vote'].message,
            '`terrible` is not a valid enum value for path `vote`.');

          done();
        });
      });
    });

    it('should validate subdocuments subproperty enums (gh-4111)', function(done) {
      const M = mongoose.model('M', new Schema({
        p: {
          val: { type: String, enum: ['test'] }
        },
        children: [{
          prop: {
            val: { type: String, enum: ['valid'] }
          }
        }]
      }));

      const model = new M();
      model.p = { val: 'test' };
      const child = model.children.create();
      child.prop = {
        val: 'valid'
      };

      model.children.push(child);

      model.validate(function(error) {
        assert.ifError(error);

        child.prop.val = 'invalid';

        assert.equal(model.children[0].prop.val, 'invalid');

        model.validate(function(error) {
          assert.ok(error);
          assert.equal(error.errors['children.0.prop.val'].message,
            '`invalid` is not a valid enum value for path `prop.val`.');

          done();
        });
      });
    });

    it('doesnt do double validation on document arrays (gh-2618)', function(done) {
      const A = new Schema({str: String});
      let B = new Schema({a: [A]});
      let validateCalls = 0;
      B.path('a').validate(function() {
        ++validateCalls;
        return true;
      });

      B = mongoose.model('b', B);

      const p = new B();
      p.a.push({str: 'asdf'});
      p.validate(function(err) {
        assert.ifError(err);
        assert.equal(validateCalls, 1);
        done();
      });
    });

    it('doesnt do double validation on document arrays underneath nested (gh-5411)', function(done) {
      const callScope = [];

      function myValidator() {
        callScope.push(this);
      }

      const TestSchema = new Schema({
        nest1: {
          nest2: {
            nestarr: [new Schema({
              value: {
                type: Boolean,
                required: false,
                validate: {validator: myValidator}
              }
            })]
          }
        }
      });

      const Test = mongoose.model('gh5411', TestSchema);
      const testInstance = new Test({
        nest1: {
          nest2: {
            nestarr: [{
              value: true
            }]
          }
        }
      });

      testInstance.nest1 = {
        nest2: {
          nestarr: [{
            value: false
          }]
        }
      };

      testInstance.validateSync();
      assert.equal(callScope.length, 1);
      assert.strictEqual(callScope[0], testInstance.nest1.nest2.nestarr[0]);
      done();
    });

    it('no double validation on set nested docarray (gh-4145)', function(done) {
      let calls = 0;
      const myValidator = function() {
        ++calls;
        return true;
      };

      const InnerSchema = new mongoose.Schema({
        myfield: {
          type: String,
          validate: {
            validator: myValidator,
            message: 'Message'
          }
        },
        sibling: String
      });

      const MySchema = new mongoose.Schema({
        nest: {
          myarray: [InnerSchema]
        },
        rootSibling: String
      });

      const Model = mongoose.model('gh4145', MySchema);

      const instance = new Model({
        rootSibling: 'This is the root sibling'
      });
      // Direct object assignment
      instance.nest = {
        myarray: [{
          myfield: 'This is my field',
          sibling: 'This is the nested sibling'
        }]
      };

      instance.validate(function(error) {
        assert.ifError(error);
        assert.equal(calls, 1);
        done();
      });
    });

    it('returns cast errors', function(done) {
      const breakfastSchema = new Schema({
        eggs: Number
      });
      const Breakfast = mongoose.model('gh-2611', breakfastSchema, 'gh-2611');

      const bad = new Breakfast({eggs: 'none'});
      bad.validate(function(error) {
        assert.ok(error);
        done();
      });
    });

    it('handles multiple subdocument errors (gh-2589)', function(done) {
      const foodSchema = new Schema({name: {type: String, required: true, enum: ['bacon', 'eggs']}});
      const breakfast = new Schema({foods: [foodSchema], id: Number});

      const Breakfast = mongoose.model('gh-2589', breakfast, 'gh-2589');
      const bad = new Breakfast({foods: [{name: 'tofu'}, {name: 'waffles'}], id: 'Not a number'});
      bad.validate(function(error) {
        assert.ok(error);
        assert.deepEqual(['id', 'foods.0.name', 'foods.1.name'], Object.keys(error.errors));
        done();
      });
    });

    it('handles subdocument cast errors (gh-2819)', function(done) {
      const foodSchema = new Schema({eggs: {type: Number, required: true}});
      const breakfast = new Schema({foods: [foodSchema], id: Number});

      const Breakfast = mongoose.model('gh-2819', breakfast, 'gh-2819');

      // Initially creating subdocs with cast errors
      const bad = new Breakfast({foods: [{eggs: 'Not a number'}], id: 'Not a number'});
      bad.validate(function(error) {
        assert.ok(error);
        assert.deepEqual(['foods.0.eggs', 'id'], Object.keys(error.errors).sort());
        assert.ok(error.errors['foods.0.eggs'] instanceof mongoose.Error.CastError);

        // Pushing docs with cast errors
        bad.foods.push({eggs: 'Also not a number'});
        bad.validate(function(error) {
          assert.deepEqual(['foods.0.eggs', 'foods.1.eggs', 'id'], Object.keys(error.errors).sort());
          assert.ok(error.errors['foods.1.eggs'] instanceof mongoose.Error.CastError);

          // Splicing docs with cast errors
          bad.foods.splice(1, 1, {eggs: 'fail1'}, {eggs: 'fail2'});
          bad.validate(function(error) {
            assert.deepEqual(['foods.0.eggs', 'foods.1.eggs', 'foods.2.eggs', 'id'], Object.keys(error.errors).sort());
            assert.ok(error.errors['foods.0.eggs'] instanceof mongoose.Error.CastError);
            assert.ok(error.errors['foods.1.eggs'] instanceof mongoose.Error.CastError);
            assert.ok(error.errors['foods.2.eggs'] instanceof mongoose.Error.CastError);

            // Remove the cast error by setting field
            bad.foods[2].eggs = 3;
            bad.validate(function(error) {
              assert.deepEqual(['foods.0.eggs', 'foods.1.eggs', 'id'], Object.keys(error.errors).sort());
              assert.ok(error.errors['foods.0.eggs'] instanceof mongoose.Error.CastError);
              assert.ok(error.errors['foods.1.eggs'] instanceof mongoose.Error.CastError);

              // Remove the cast error using array.set()
              bad.foods.set(1, {eggs: 1});
              bad.validate(function(error) {
                assert.deepEqual(['foods.0.eggs', 'id'], Object.keys(error.errors).sort());
                assert.ok(error.errors['foods.0.eggs'] instanceof mongoose.Error.CastError);

                done();
              });
            });
          });
        });
      });
    });

    it('fails when you try to set a nested path to a primitive (gh-2592)', function(done) {
      const breakfast = new Schema({foods: {bacon: Number, eggs: Number}});

      const Breakfast = mongoose.model('gh-2592', breakfast, 'gh-2592');

      const bad = new Breakfast();
      bad.foods = 'waffles';
      bad.validate(function(error) {
        assert.ok(error);
        const errorMessage = 'foods: Cast to Object failed for value ' +
            '"waffles" at path "foods"';
        assert.ok(error.toString().indexOf(errorMessage) !== -1, error.toString());
        done();
      });
    });

    it('doesnt execute other validators if required fails (gh-2725)', function(done) {
      const breakfast = new Schema({description: {type: String, required: true, maxlength: 50}});

      const Breakfast = mongoose.model('gh2725', breakfast, 'gh2725');
      const bad = new Breakfast({});
      bad.validate(function(error) {
        assert.ok(error);
        const errorMessage = 'ValidationError: description: Path `description` is required.';
        assert.equal(errorMessage, error.toString());
        done();
      });
    });

    it('doesnt execute other validators if required fails (gh-3025)', function(done) {
      const breakfast = new Schema({description: {type: String, required: true, maxlength: 50}});

      const Breakfast = mongoose.model('gh3025', breakfast, 'gh3025');
      const bad = new Breakfast({});
      const error = bad.validateSync();

      assert.ok(error);
      const errorMessage = 'ValidationError: description: Path `description` is required.';
      assert.equal(errorMessage, error.toString());
      done();
    });

    it('validateSync allows you to filter paths (gh-3153)', function(done) {
      const breakfast = new Schema({
        description: {type: String, required: true, maxlength: 50},
        other: {type: String, required: true}
      });

      const Breakfast = mongoose.model('gh3153', breakfast, 'gh3153');
      const bad = new Breakfast({});
      const error = bad.validateSync('other');

      assert.ok(error);
      assert.equal(Object.keys(error.errors).length, 1);
      assert.ok(error.errors.other);
      assert.ok(!error.errors.description);
      done();
    });

    it('adds required validators to the front of the list (gh-2843)', function(done) {
      const breakfast = new Schema({description: {type: String, maxlength: 50, required: true}});

      const Breakfast = mongoose.model('gh2843', breakfast, 'gh2843');
      const bad = new Breakfast({});
      bad.validate(function(error) {
        assert.ok(error);
        const errorMessage = 'ValidationError: description: Path `description` is required.';
        assert.equal(errorMessage, error.toString());
        done();
      });
    });

    it('sets path correctly when setter throws exception (gh-2832)', function(done) {
      const breakfast = new Schema({
        description: {
          type: String, set: function() {
            throw new Error('oops');
          }
        }
      });

      const Breakfast = mongoose.model('gh2832', breakfast, 'gh2832');
      Breakfast.create({description: undefined}, function(error) {
        assert.ok(error);
        const errorMessage = 'ValidationError: description: Cast to String failed for value "undefined" at path "description"';
        assert.equal(errorMessage, error.toString());
        assert.ok(error.errors.description);
        assert.equal(error.errors.description.reason.toString(), 'Error: oops');
        done();
      });
    });

    it('allows you to validate embedded doc that was .create()-ed (gh-2902) (gh-2929)', function(done) {
      const parentSchema = mongoose.Schema({
        children: [{name: {type: String, required: true}}]
      });

      const Parent = mongoose.model('gh2902', parentSchema);

      const p = new Parent();
      const n = p.children.create({name: '2'});
      n.validate(function(error) {
        assert.ifError(error);
        const bad = p.children.create({});
        p.children.push(bad);
        bad.validate(function(error) {
          assert.ok(error);
          assert.ok(error.errors['name']);
          done();
        });
      });
    });

    it('returns correct kind for user defined custom validators (gh-2885)', function(done) {
      const s = mongoose.Schema({
        n: {
          type: String, validate: {
            validator: function() {
              return false;
            }
          }, msg: 'fail'
        }
      });
      const M = mongoose.model('gh2885', s);

      const m = new M({n: 'test'});
      m.validate(function(error) {
        assert.ok(error);
        assert.equal(error.errors.n.kind, 'user defined');
        done();
      });
    });

    it('enums report kind (gh-3009)', function(done) {
      const s = mongoose.Schema({n: {type: String, enum: ['a', 'b']}});
      const M = mongoose.model('gh3009', s);

      const m = new M({n: 'test'});
      m.validate(function(error) {
        assert.ok(error);
        assert.equal(error.errors.n.kind, 'enum');
        done();
      });
    });

    it('enums on arrays (gh-6102)', function() {
      assert.throws(function() {
        new Schema({
          array: {
            type: [Number],
            enum: [1]
          }
        });
      }, /`enum` can only be set on an array of strings/);

      const MySchema = new Schema({
        array: {
          type: [String],
          enum: ['qwerty']
        }
      });

      const Model = mongoose.model('gh6102', MySchema);
      const doc = new Model({ array: ['test'] });

      return doc.validate().
        then(() => assert.ok(false)).
        catch(err => assert.equal(err.name, 'ValidationError'));
    });

    it('skips conditional required (gh-3539)', function(done) {
      const s = mongoose.Schema({
        n: {
          type: Number, required: function() {
            return false;
          }, min: 0
        }
      });
      const M = mongoose.model('gh3539', s);

      const m = new M();
      m.validate(function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('handles function for date min/max (gh-7600)', function() {
      const s = mongoose.Schema({
        minDate: String,
        date: {
          type: Date,
          min: function() { return this.minDate; }
        }
      });
      const M = mongoose.model('gh7600', s);

      let m = new M({ minDate: '2018-06-01', date: '2018-05-01' });
      let err = m.validateSync();
      assert.ok(err);
      assert.ok(err.errors['date']);

      m = new M({ minDate: '2018-06-01', date: '2018-07-01' });
      err = m.validateSync();
      assert.ifError(err);
    });

    it('evaluate message function gh6523', function(done) {
      const s = mongoose.Schema({
        n: {
          type: String,
          // required: true,
          validate: {
            validator: function() {
              return false;
            },
            message: function(properties) {
              return 'fail ' + properties.value;
            }
          }
        }
      });
      const M = mongoose.model('gh6523', s);
      const m = new M({ n: 0 });

      m.validate(function(error) {
        assert.equal('fail 0', error.errors['n'].message);
        done();
      });
    });

    it('evaluate message function for required field gh6523', function(done) {
      const s = mongoose.Schema({
        n: {
          type: String,
          // required: true,
          required: [true, function(properties) {
            return 'fail ' + properties.path;
          }]
        }
      });
      const M = mongoose.model('gh6523-2', s);
      const m = new M();

      m.validate(function(error) {
        assert.equal('fail n', error.errors['n'].message);
        done();
      });
    });
  });
});
