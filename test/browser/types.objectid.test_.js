var ObjectId = mongoose.Types.ObjectId;

describe('types.objectid', function() {
  it('Should Correctly convert ObjectId to itself', function(done) {
    var myObject, newObject;
    var selfConvertion = function() {
      myObject = new ObjectId();
      newObject = ObjectId(myObject);
    };

    assert.doesNotThrow(selfConvertion);
    assert.equal(myObject, newObject);
    done();
  });

  it('ObjectId should correctly create objects', function(done) {
    try {
      ObjectId.createFromHexString('000000000000000000000001');
      ObjectId.createFromHexString('00000000000000000000001');
      assert.ok(false);
    } catch (err) {
      assert.ok(err !== null);
    }

    done();
  });

  it('ObjectId should correctly retrieve timestamp', function(done) {
    var testDate = new Date();
    var object1 = new ObjectId();
    assert.equal(Math.floor(testDate.getTime() / 1000), Math.floor(object1.getTimestamp().getTime() / 1000));

    done();
  });

  it('ObjectId should have a correct cached representation of the hexString', function(done) {
    ObjectId.cacheHexString = true;
    var a = new ObjectId;
    var __id = a.__id;
    assert.equal(__id, a.toHexString());

    // hexString
    a = new ObjectId(__id);
    assert.equal(__id, a.toHexString());

    // fromHexString
    a = ObjectId.createFromHexString(__id);
    assert.equal(a.__id, a.toHexString());
    assert.equal(__id, a.toHexString());

    // number
    var genTime = a.generationTime;
    a = new ObjectId(genTime);
    __id = a.__id;
    assert.equal(__id, a.toHexString());

    // generationTime
    delete a.__id;
    a.generationTime = genTime;
    assert.equal(__id, a.toHexString());

    // createFromTime
    a = ObjectId.createFromTime(genTime);
    __id = a.__id;
    assert.equal(__id, a.toHexString());
    ObjectId.cacheHexString = false;

    done();
  });

  it('Should fail to create ObjectId due to illegal hex code', function(done) {
    assert.throws(function() {
      new ObjectId('zzzzzzzzzzzzzzzzzzzzzzzz');
    });
    done();
  });

  it('Should validate ObjectId', function(done) {
    assert.equal(false, ObjectId.isValid(null));
    assert.equal(false, ObjectId.isValid({}));
    assert.equal(false, ObjectId.isValid([]));
    assert.equal(false, ObjectId.isValid(true));
    assert.equal(true, ObjectId.isValid(0));
    assert.equal(false, ObjectId.isValid('invalid'));
    assert.equal(true, ObjectId.isValid('zzzzzzzzzzzz'));
    assert.equal(false, ObjectId.isValid('zzzzzzzzzzzzzzzzzzzzzzzz'));
    assert.equal(true, ObjectId.isValid('000000000000000000000000'));

    done();
  });
});
