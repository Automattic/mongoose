
/**
 * Test dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , assert = require('assert')
  , random = require('../lib/utils').random
  , Query = require('../lib/query')
  , Schema = mongoose.Schema
  , SchemaType = mongoose.SchemaType
  , CastError = SchemaType.CastError
  , ValidatorError = SchemaType.ValidatorError
  , ValidationError = mongoose.Document.ValidationError
  , ObjectId = Schema.ObjectId
  , DocumentObjectId = mongoose.Types.ObjectId
  , DocumentArray = mongoose.Types.DocumentArray
  , EmbeddedDocument = mongoose.Types.Embedded
  , MongooseArray = mongoose.Types.Array
  , MongooseError = mongoose.Error;

/**
 * Setup.
 */

var Comments = new Schema();

Comments.add({
    title     : String
  , date      : Date
  , comments  : [Comments]
});

var BlogPost = new Schema({
    title     : String
  , date      : Date
  , meta      : {
        date      : Date
      , visitors  : Number
      , nested    : [Comments]
      , numbers   : [Number]
    }
  , mixed     : {}
  , numbers   : [Number]
  , comments  : [Comments]
  , arr       : []
}, { collection: 'versioning_' + random()});


mongoose.model('Versioning', BlogPost);

module.exports = {

  'versioning': function () {
    var db = start()
      , V = db.model('Versioning')

    var doc = new V;
    doc.title = 'testing versioning'
    doc.date = new Date;
    doc.meta.date = new Date;
    doc.meta.visitors = 34;
    doc.meta.numbers = [12,11,10]
    doc.meta.nested = [
        { title: 'does it work?', date: new Date }
      , { title: '1', comments: [{ title: 'this is sub #1'},{ title: 'this is sub #2'}] }
      , { title: '2', comments: [{ title: 'this is sub #3'},{ title: 'this is sub #4'}] }
      , { title: 'hi', date: new Date }
    ];
    doc.mixed = { arr: [12,11,10] }
    doc.numbers = [3,4,5,6,7]
    doc.comments = [
        { title: 'comments 0', date: new Date }
      , { title: 'comments 1', comments: [{ title: 'comments.1.comments.1'},{ title: 'comments.1.comments.2'}] }
      , { title: 'coments 2', comments: [{ title: 'comments.2.comments.1'},{ title: 'comments.2.comments.2'}] }
      , { title: 'comments 3', date: new Date }
    ];
    doc.arr = [['2d']]

    doc.save(function (err) {
      var a , b;
      assert.ifError(err);
      // test 2 concurrent ops
      V.findById(doc, function (err, _a) {
        assert.ifError(err);
        a = _a;
        a && b && test1(a, b);
      });
      V.findById(doc, function (err, _b) {
        assert.ifError(err);
        b = _b;
        a && b && test1(a, b);
      });
    });

    function test1 (a, b) {
      a.meta.numbers.push(9);
      b.meta.numbers.push(8);
      save(a, b, test2);
    }

    function test2 (err, a, b) {
      assert.ifError(err);
      assert.equal(a.meta.numbers.length, 5);
      a.meta.numbers.pull(10);
      b.meta.numbers.push(20);
      save(a, b, test3);
    }

    function test3 (err, a, b) {
      assert.ifError(err);
      assert.equal(a.meta.numbers.length, 5);
      assert.equal(a.meta.numbers.length, 5);
      assert.equal(-1, a.meta.numbers.indexOf(10));
      assert.ok(~a.meta.numbers.indexOf(20));

      a.numbers.$pullAll([3, 20]);

      // should fail
      b.set('numbers.2', 100);
      save(a, b, test4)
    }

    function test4 (err, a, b) {
      assert.ok(/No matching document/.test(err));
      a.set('arr.0.0', 'updated');
      var d = a._delta()[0];
      assert.equal(a._doc.__v, d.__v, 'version should be added to where clause')
      save(a,b,test5);
    }

    function test5 (err, a, b) {
      assert.ifError(err);
      assert.equal('updated', a.arr[0][0]);
      a.set('arr.0', 'not an array');
      // should overwrite a's changes, last write wins
      b.arr.pull(10);
      b.arr.addToSet('using set');
      save(a, b, test6);
    }

    function test6 (err, a, b) {
      assert.ifError(err);
      assert.equal(a.arr.length, 2);
      assert.equal('updated', a.arr[0][0]);
      assert.equal('using set', a.arr[1]);
      b.set('arr.0', 'not an array');
      // should overwrite b's changes, last write wins
      // force a $set
      a.arr.pullAll(['using set']);
      a.arr.push('woot', 'woot2');
      a.arr.$pop();
      save(a, b, test7)
    }

    function test7 (err,a,b) {
      assert.ok(/No matching document/.test(err), 'changes to b should not be applied');
      assert.equal(a.arr.length, 2);
      assert.equal('updated', a.arr[0][0]);
      assert.equal('woot', a.arr[1]);
      a.meta.nested.$pop();
      b.meta.nested.$pop();
      save(a, b, test8);
    }

    function test8 (err, a, b) {
      assert.ok(/No matching document/.test(err), 'changes to b should not be applied');
      assert.equal(a.meta.nested.length, 3);
      a.meta.nested.$push({ title: 'the' });
      a.meta.nested.$push({ title: 'killing' });
      b.meta.nested.$push({ title: 'biutiful' });
      save(a, b, test9);
    }

    function test9 (err, a, b) {
      assert.ifError(err);
      assert.equal(6, a.meta.nested.length);
      // nested subdoc property changes should not trigger version increments
      a.meta.nested[2].title = 'two';
      b.meta.nested[0].title = 'zero';
      b.meta.nested[1].comments[0].title = 'sub one';
      save(a,b,test10);
    }

    function test10 (err, a, b) {
      assert.ifError(err);
      assert.equal('two', b.meta.nested[2].title);
      assert.equal('zero', b.meta.nested[0].title);
      assert.equal('sub one', b.meta.nested[1].comments[0].title);

      assert.equal(3, a.mixed.arr.length);
      a.mixed.arr.push([10],{x:1},'woot');
      a.markModified('mixed.arr');
      save(a, b, test11);
    }

    function test11 (err, a, b) {
      assert.ifError(err);
      assert.equal(a._doc.__v, 6)
      assert.equal(6, a.mixed.arr.length);
      assert.equal(1, a.mixed.arr[4].x)
      assert.equal('woot', a.mixed.arr[5])
      assert.equal(10, a.mixed.arr[3][0])

      a.comments.addToSet({ title: 'aven' });
      a.comments.addToSet({ title: 'avengers' });
      var d = a._delta();
      assert.equal(undefined, d[0].__v, 'version should not be included');
      assert.ok(!d[1].$set);
      assert.ok(d[1].$addToSet);
      assert.ok(d[1].$addToSet.comments);

      a.comments.$shift();
      var d = a._delta();
      assert.equal(6, d[0].__v, 'version should be included in where clause');
      assert.ok(d[1].$set, 'two differing atomic ops on same path should create a $set');
      assert.ok(d[1].$inc, 'a $set of an array should trigger versioning');
      assert.ok(!d[1].$addToSet);

      done();
    }

    function done () {
      db.close();
    }

    function save (a, b, cb) {
      var pending = 2;
      var e;
      a.save(function (err) {
        if (err) e = err;
        if (--pending) return;
        lookup();
      });
      b.save(function (err) {
        if (err) e = err;
        if (--pending) return;
        lookup();
      });
      function lookup () {
        var a1, b1;
        V.findById(a, function (err, a_) {
          if (err) e = err;
          a1 = a_;
          a1 && b1 && cb(e, a1, b1);
        });
        V.findById(b, function (err, b_) {
          if (err) e = err;
          b1 = b_;
          a1 && b1 && cb(e, a1, b1);
        });
      }
    }

  },

  'versioning without version key': function () {
    var db = start()
      , V = db.model('Versioning')

    var doc = new V;
    doc.numbers = [3,4,5,6,7]
    doc.comments = [
        { title: 'does it work?', date: new Date }
      , { title: '1', comments: [{ title: 'this is sub #1'},{ title: 'this is sub #2'}] }
      , { title: '2', comments: [{ title: 'this is sub #3'},{ title: 'this is sub #4'}] }
      , { title: 'hi', date: new Date }
    ];

    doc.save(test);

    function test (err) {
      assert.ifError(err);
      // test getting docs back from db missing version key
      V.findById(doc).select('numbers comments').exec(function (err, doc) {
        db.close();
        assert.ifError(err);
        doc.comments[0].title = 'no version was included';
        var d = doc._delta();
        assert.ok(!d[0].__v, 'no version key was selected so should not be included');
      })
    }
  }
}
