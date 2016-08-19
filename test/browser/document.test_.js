var Schema = mongoose.Schema,
    ObjectId = mongoose.Schema.Types.ObjectId;

var em = new mongoose.Schema({title: String, body: String});
em.virtual('works').get(function() {
  return 'em virtual works';
});

var schema = new Schema({
  test: String,
  oids: [ObjectId],
  numbers: [Number],
  nested: {
    age: Number,
    cool: ObjectId,
    deep: {x: String},
    path: String,
    setr: String
  },
  nested2: {
    nested: String,
    yup: {
      nested: Boolean,
      yup: String,
      age: Number
    }
  },
  em: [em],
  date: Date
});

schema.virtual('nested.agePlus2').get(function() {
  return this.get('nested.age') + 2;
});
schema.virtual('nested.setAge').set(function(v) {
  this.set('nested.age', v);
});
schema.path('nested.path').get(function(v) {
  return (this.get('nested.age') || '') + (v ? v : '');
});
schema.path('nested.setr').set(function(v) {
  return v + ' setter';
});

describe('browser:document', function() {
  it('work', function(done) {
    var obj = {
      test: 'test',
      oids: [],
      nested: {
        age: 5,
        cool: mongoose.Types.ObjectId.createFromHexString('4c6c2d6240ced95d0e00003c'),
        path: 'my path'
      }
    };

    var doc = new mongoose.Document(obj, schema);

    assert.equal('test', doc.test);
    assert.ok(doc.get('oids') instanceof Array);
    assert.equal(doc.get('nested.age'), 5);
    assert.equal(String(doc.get('nested.cool')), '4c6c2d6240ced95d0e00003c');
    assert.equal(7, doc.get('nested.agePlus2'));
    assert.equal('5my path', doc.get('nested.path'));
    doc.set('nested.setAge', 10);
    assert.equal(10, doc.get('nested.age'));
    doc.set('nested.setr', 'set it');
    assert.equal(doc.getValue('nested.setr'), 'set it setter');

    var doc2 = new mongoose.Document(
      {
        test: 'toop',
        oids: [],
        nested: {
          age: 2,
          cool: mongoose.Types.ObjectId.createFromHexString('4cf70857337498f95900001c'),
          deep: {x: 'yay'}
        }
      },
        schema);

    assert.equal('toop', doc2.get('test'));
    assert.ok(doc2.get('oids') instanceof Array);
    assert.equal(doc2.get('nested.age'), 2);

    // GH-366
    assert.equal(doc2.get('nested.bonk'), undefined);
    assert.equal(doc2.get('nested.nested'), undefined);
    assert.equal(doc2.get('nested.test'), undefined);
    assert.equal(doc2.get('nested.age.test'), undefined);
    assert.equal(doc2.get('nested.age.nested'), undefined);
    assert.equal(doc2.get('oids.nested'), undefined);
    assert.equal(doc2.get('nested.deep.x'), 'yay');
    assert.equal(doc2.get('nested.deep.nested'), undefined);
    assert.equal(doc2.get('nested.deep.cool'), undefined);
    assert.equal(doc2.get('nested2.yup.nested'), undefined);
    assert.equal(doc2.get('nested2.yup.nested2'), undefined);
    assert.equal(doc2.get('nested2.yup.yup'), undefined);
    assert.equal(doc2.get('nested2.yup.age'), undefined);
    assert.equal('object', typeof doc2.get('nested2.yup'));

    doc2.set('nested2.yup', {
      age: 150,
      yup: 'Yesiree',
      nested: true
    });

    assert.equal(doc2.get('nested2.nested'), undefined);
    assert.equal(doc2.get('nested2.yup.nested'), true);
    assert.equal(doc2.get('nested2.yup.yup'), 'Yesiree');
    assert.equal(doc2.get('nested2.yup.age'), 150);
    doc2.set('nested2.nested', 'y');
    assert.equal(doc2.get('nested2.nested'), 'y');
    assert.equal(doc2.get('nested2.yup.nested'), true);
    assert.equal(doc2.get('nested2.yup.yup'), 'Yesiree');
    assert.equal(150, doc2.get('nested2.yup.age'));

    assert.equal(String(doc2.get('nested.cool')), '4cf70857337498f95900001c');

    assert.ok(doc.get('oids') !== doc2.get('oids'));
    done();
  });
});

describe('browser:validate', function() {
  it('works', function(done) {
    var called = false;
    var validate = [function() {
      called = true;
      return true;
    }, 'BAM'];

    schema = new Schema({
      prop: {type: String, required: true, validate: validate},
      nick: {type: String, required: true}
    });

    var doc = new mongoose.Document({}, schema);
    doc.validate(function(error) {
      assert.ok(!!error);
      assert.ok(called);
      assert.equal('Path `prop` is required.', error.errors['prop'].message);
      assert.equal('Path `nick` is required.', error.errors['nick'].message);

      doc.prop = 'Bacon';
      doc.validate(function(error) {
        assert.ok(!error.errors['prop']);
        assert.equal('Path `nick` is required.', error.errors['nick'].message);
        done();
      });
    });
  });
});

describe('#equals', function() {
  describe('should work', function() {
    var S = new Schema({_id: String});
    var N = new Schema({_id: Number});
    var O = new Schema({_id: Schema.ObjectId});
    var B = new Schema({_id: mongoose.Schema.Types.Buffer});
    var M = new Schema({name: String}, {_id: false});

    it('with string _ids', function(done) {
      var s1 = new mongoose.Document({_id: 'one'}, S);
      var s2 = new mongoose.Document({_id: 'one'}, S);
      assert.ok(s1.equals(s2));
      done();
    });
    it('with number _ids', function(done) {
      var n1 = new mongoose.Document({_id: 0}, N);
      var n2 = new mongoose.Document({_id: 0}, N);
      assert.ok(n1.equals(n2));
      done();
    });
    it('with ObjectId _ids', function(done) {
      var id = new mongoose.Types.ObjectId;
      var o1 = new mongoose.Document({_id: id}, O);
      var o2 = new mongoose.Document({_id: id}, O);
      assert.ok(o1.equals(o2));

      id = String(new mongoose.Types.ObjectId);
      o1 = new mongoose.Document({_id: id}, O);
      o2 = new mongoose.Document({_id: id}, O);
      assert.ok(o1.equals(o2));
      done();
    });
    it('with Buffer _ids', function(done) {
      var n1 = new mongoose.Document({_id: 0}, B);
      var n2 = new mongoose.Document({_id: 0}, B);
      assert.ok(n1.equals(n2));
      done();
    });
    it('with _id disabled (gh-1687)', function(done) {
      var m1 = new mongoose.Document({}, M);
      var m2 = new mongoose.Document({}, M);
      assert.doesNotThrow(function() {
        m1.equals(m2);
      });
      done();
    });
  });
});
