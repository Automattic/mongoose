'use strict';

/**
 * Module dependencies.
 */

const assert = require('assert');
const start = require('./common');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

/**
 * Test.
 */

describe('types.embeddeddocumentdeclarative', function() {
  describe('with a parent with a field with type set to a POJO', function() {
    const ParentSchemaDef = {
      name: String,
      child: {
        type: {
          name: String
        }
      }
    };

    describe('creates subdocument schema if `type` is an object with keys', function() {
      const ParentSchema = new mongoose.Schema(ParentSchemaDef);
      it('interprets the POJO as a subschema (gh-7494)', function(done) {
        assert.equal(ParentSchema.paths.child.instance, 'Embedded');
        assert.strictEqual(ParentSchema.paths.child['$isSingleNested'], true);
        done();
      });
      it('enforces provided schema on the child path, unlike Mixed (gh-7494)', function(done) {
        const ParentModel = mongoose.model('ParentModel-7494-EmbeddedDeclarativeSubschema', ParentSchema);
        const kingDaphnes = new ParentModel({
          name: 'King Daphnes Nohansen Hyrule',
          child: {
            name: 'Princess Zelda',
            mixedUp: 'not'
          }
        });
        const princessZelda = kingDaphnes.child.toObject();

        assert.equal(princessZelda.name, 'Princess Zelda');
        assert.strictEqual(princessZelda.mixedUp, undefined);
        done();
      });

      it('underneath array (gh-8627)', function() {
        const schema = new Schema({
          arr: [{
            nested: {
              type: { test: String }
            }
          }]
        });

        assert.ok(schema.path('arr').schema.path('nested').instance !== 'Mixed');
        assert.ok(schema.path('arr').schema.path('nested.test') instanceof mongoose.Schema.Types.String);
      });

      it('nested array (gh-8627)', function() {
        const schema = new Schema({
          l1: {
            type: {
              l2: {
                type: {
                  test: String
                }
              }
            }
          }
        });

        assert.ok(schema.path('l1').instance !== 'Mixed');
        assert.ok(schema.path('l1.l2').instance !== 'Mixed');
      });
    });
  });
  describe('with a parent with a POJO field with a field "type" with a type set to "String"', function() {
    const ParentSchemaDef = {
      name: String,
      child: {
        name: String,
        type: {
          type: String
        }
      }
    };
    const ParentSchemaNotMixed = new Schema(ParentSchemaDef);
    const ParentSchemaNotSubdoc = new Schema(ParentSchemaDef);
    it('does not create a path for child in either option', function(done) {
      assert.equal(ParentSchemaNotMixed.paths['child.name'].instance, 'String');
      assert.equal(ParentSchemaNotSubdoc.paths['child.name'].instance, 'String');
      done();
    });
    it('treats type as a property name not a type in both options', function(done) {
      assert.equal(ParentSchemaNotMixed.paths['child.type'].instance, 'String');
      assert.equal(ParentSchemaNotSubdoc.paths['child.type'].instance, 'String');
      done();
    });
    it('enforces provided schema on the child tree in both options, unlike Mixed (gh-7494)', function(done) {
      const ParentModelNotMixed = mongoose.model('ParentModel-7494-EmbeddedDeclarativeNestedNotMixed', ParentSchemaNotMixed);
      const ParentModelNotSubdoc = mongoose.model('ParentModel-7494-EmbeddedDeclarativeNestedNotSubdoc', ParentSchemaNotSubdoc);

      const grandmother = new ParentModelNotMixed({
        name: 'Grandmother',
        child: {
          name: 'Rito Chieftan',
          type: 'Mother',
          confidence: 10
        }
      });
      const ritoChieftan = new ParentModelNotSubdoc({
        name: 'Rito Chieftan',
        child: {
          name: 'Prince Komali',
          type: 'Medli',
          confidence: 1
        }
      });

      assert.equal(grandmother.child.name, 'Rito Chieftan');
      assert.equal(grandmother.child.type, 'Mother');
      assert.strictEqual(grandmother.child.confidence, undefined);
      assert.equal(ritoChieftan.child.name, 'Prince Komali');
      assert.equal(ritoChieftan.child.type, 'Medli');
      assert.strictEqual(ritoChieftan.child.confidence, undefined);
      done();
    });
  });
});
