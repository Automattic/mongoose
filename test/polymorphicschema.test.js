
/**
 * Module dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , assert = require('assert')
  , Schema = mongoose.Schema
  , PolymorphicSchema = mongoose.PolymorphicSchema
  , SchemaDeterminant = PolymorphicSchema.SchemaDeterminant;

describe('PolymorphicSchema', function() {

  describe('ctor', function() {  

    it('throws without a SchemaDeterminant', function() {
      var threw;
      try {
        new PolymorphicSchema({});
      } catch (e) {
        threw = true;
      }
      assert.ok(threw);
    });

    it('throws with multiple SchemaDeterminants', function() {
      var threw;
      try {
        new PolymorphicSchema({
          _determinantOne : SchemaDeterminantS
        , _determinantTwo :  SchemaDeterminant
        });
      } catch (e) {
        threw = true;
      }
      assert.ok(threw);
    });

    it('succeeds with SchemaDeterminant short form', function() {
      new PolymorphicSchema({ _determinant : SchemaDeterminant });
      assert.ok(true);
    });

    it('succeeds with SchemaDeterminant long form', function() {
      new PolymorphicSchema({ _determinant : { type : SchemaDeterminant } });
      assert.ok(true);
    });

    it('overwrites incompatible SchemaDeterminant properties', function() {
      var poly = new PolymorphicSchema({ _determinant : { type : SchemaDeterminant, required : false, enum : [ 'x' ] } });

      assert.strictEqual(true, poly.tree._determinant.required);
      assert.strictEqual(0, poly.tree._determinant.enum.length);
    });

    it('includes compatible SchemaDeterminant properties', function() {
      var poly = new PolymorphicSchema({ _determinant : { type : SchemaDeterminant, index : true } });
      assert.strictEqual(true, poly.tree._determinant.index);
    });
  });

  describe('sub', function() {

    function getWidgetCounterSchema() {
      return new PolymorphicSchema({
        _determinant : SchemaDeterminant
      , widgetCount : Number
      });
    }

    it ('adds properties to the parent schema', function() {
      var poly = getWidgetCounterSchema();
      poly.sub('a', new Schema({
        wazzitCount : Number
      }));
      assert.strictEqual(Number, poly.tree.wazzitCount.type);
    });

    it ('adds nested properties to the parent schema', function() {
      var poly = getWidgetCounterSchema();
      poly.sub('a', new Schema({
        whozzit : { wazzitCount : Number }
      }));
      assert.strictEqual(Number, poly.tree.whozzit.wazzitCount.type);
    });

    it ('Removes "required" attributes before adding properties to the parent schema', function() {
      var poly = getWidgetCounterSchema();
      var sub = new Schema({
        wazzitCount : { type: Number, required : true }
      });
      poly.sub('a', sub)
      assert.strictEqual(true, sub.tree.wazzitCount.required);
      assert.strictEqual(Number, poly.tree.wazzitCount.type);
      assert.strictEqual(undefined, poly.tree.wazzitCount.required);
    });

    it ('Removes "default" attributes before adding properties to the parent schema', function() {
      var poly = getWidgetCounterSchema();
      var sub = new Schema({
        _determinant: { type : String, 'default' : 'WazzitCounter' }
      , wazzitCount : { type : Number, required : true }
      });
      poly.sub('WazzitCounter', sub);
      assert.strictEqual('WazzitCounter', sub.tree._determinant.default);
      assert.strictEqual(undefined, poly.tree._determinant.default);
    });

    it('fails on destructive properties added to the parent schema', function() {
      var poly = getWidgetCounterSchema();
      var threw = false;
      try {
        poly.sub('a', new Schema({
          widgetCount : String // overwrites widget as String instead of Number
        , wazzitCount : Number
        }));
      } catch (e) {
        threw = true;
      }
      assert.ok(threw);
    });

    it('fails on nested destructive properties added to the parent schema', function() {
      var poly = getWidgetCounterSchema();
      var threw = false;
      try {
        poly.sub('a', new Schema({
          widgetCount : { wazzitCount : Number }
        }));
      } catch (e) {
        threw = true;
      }
      assert.ok(threw);
    });

    it('adds to the enum of possible values for the SchemaDeterminant', function() {
      var poly = getWidgetCounterSchema();
      poly.sub('a', new Schema({}));
      poly.sub('b', new Schema({}));
      var determinantEnum = poly.tree._determinant.enum;

      assert.strictEqual(2, determinantEnum.length);
      assert.strictEqual('a', determinantEnum[0]);
      assert.strictEqual('b', determinantEnum[1]);
    });

    it('adds to PolymorphicSchema\'s internal sub-schema map and list', function() {
      var poly = getWidgetCounterSchema();
      var suba = new Schema({});
      var subb = new Schema({});
      poly.sub('a', suba);
      poly.sub('b', subb);

      assert.strictEqual(2, poly.subModelNames.length);
      assert.strictEqual('a', poly.subModelNames[0]);
      assert.strictEqual('b', poly.subModelNames[1]);

      assert.strictEqual(suba, poly.schemasByModelName['a']);
      assert.strictEqual(subb, poly.schemasByModelName['b']);
    });
  });
  
});