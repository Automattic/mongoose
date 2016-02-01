/**
 * Module dependencies.
 */

var MongooseBuffer = mongoose.Types.Buffer;

/**
 * Test.
 */

describe('types.buffer', function() {
  it('test that a mongoose buffer behaves and quacks like a buffer', function(done) {
    var a = new MongooseBuffer;

    assert.ok(a.isMongooseBuffer);
    assert.equal(true, a.equals(a));

    a = new MongooseBuffer([195, 188, 98, 101, 114]);
    var b = new MongooseBuffer('buffer shtuffs are neat');
    var c = new MongooseBuffer('aGVsbG8gd29ybGQ=', 'base64');
    var d = new MongooseBuffer(0);

    assert.equal(a.toString('utf8'), 'über');
    assert.equal(b.toString('utf8'), 'buffer shtuffs are neat');
    assert.equal(c.toString('utf8'), 'hello world');
    assert.equal(d.toString('utf8'), '');
    done();
  });

  describe('#toObject', function() {
    it('retains custom subtypes', function(done) {
      var buf = new MongooseBuffer(0);
      var out = buf.toObject(2);
      // validate the drivers Binary type output retains the option
      assert.equal(out.sub_type, 2);
      done();
    });
  });
});
