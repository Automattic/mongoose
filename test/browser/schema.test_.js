describe('schema', function(){
  it('can be created without the "new" keyword', function(done) {
    var schema = mongoose.Schema({ name: String });
    assert.ok(schema instanceof mongoose.Schema);
    done();
  })

  it('supports different schematypes', function(done) {
    var Checkin = new mongoose.Schema({
        date      : Date
      , location  : {
            lat: Number
          , lng: Number
        }
    });

    var Ferret = new mongoose.Schema({
        name      : String
      , owner     : mongoose.Schema.Types.ObjectId
      , fur       : String
      , color     : { type: String }
      , age       : Number
      , checkins  : [Checkin]
      , friends   : [mongoose.Schema.Types.ObjectId]
      , likes     : Array
      , alive     : Boolean
      , extra     : mongoose.Schema.Types.Mixed
    });

    assert.ok(Ferret.path('name') instanceof mongoose.Schema.Types.String);
    assert.ok(Ferret.path('owner') instanceof mongoose.Schema.Types.ObjectId);
    assert.ok(Ferret.path('fur') instanceof mongoose.Schema.Types.String);
    assert.ok(Ferret.path('color') instanceof mongoose.Schema.Types.String);
    assert.ok(Ferret.path('age') instanceof mongoose.Schema.Types.Number);
    assert.ok(Ferret.path('checkins') instanceof mongoose.Schema.Types.DocumentArray);
    assert.ok(Ferret.path('friends') instanceof mongoose.Schema.Types.Array);
    assert.ok(Ferret.path('likes') instanceof mongoose.Schema.Types.Array);
    assert.ok(Ferret.path('alive') instanceof mongoose.Schema.Types.Boolean);
    assert.ok(Ferret.path('extra') instanceof mongoose.Schema.Types.Mixed);

    assert.strictEqual(Ferret.path('unexistent'), undefined);

    assert.ok(Checkin.path('date') instanceof mongoose.Schema.Types.Date);

    // check strings
    var Checkin1 = new mongoose.Schema({
        date      : 'date'
      , location  : {
            lat: 'number'
          , lng: 'Number'
        }
    });

    assert.ok(Checkin1.path('date') instanceof mongoose.Schema.Types.Date);
    assert.ok(Checkin1.path('location.lat') instanceof mongoose.Schema.Types.Number);
    assert.ok(Checkin1.path('location.lng') instanceof mongoose.Schema.Types.Number);

    var Ferret1 = new mongoose.Schema({
        name      : "string"
      , owner     : "oid"
      , fur       : { type: "string" }
      , color     : { type: "String" }
      , checkins  : [Checkin]
      , friends   : Array
      , likes     : "array"
      , alive     : "Bool"
      , alive1    : "bool"
      , alive2    : "boolean"
      , extra     : "mixed"
      , obj       : "object"
      , buf       : "buffer"
      , Buf       : "Buffer"
    });

    assert.ok(Ferret1.path('name') instanceof mongoose.Schema.Types.String);
    assert.ok(Ferret1.path('owner') instanceof mongoose.Schema.Types.ObjectId);
    assert.ok(Ferret1.path('fur') instanceof mongoose.Schema.Types.String);
    assert.ok(Ferret1.path('color') instanceof mongoose.Schema.Types.String);
    assert.ok(Ferret1.path('checkins') instanceof mongoose.Schema.Types.DocumentArray);
    assert.ok( Ferret1.path('friends') instanceof mongoose.Schema.Types.Array);
    assert.ok(Ferret1.path('likes') instanceof mongoose.Schema.Types.Array);
    assert.ok(Ferret1.path('alive') instanceof mongoose.Schema.Types.Boolean);
    assert.ok(Ferret1.path('alive1') instanceof mongoose.Schema.Types.Boolean);
    assert.ok(Ferret1.path('alive2') instanceof mongoose.Schema.Types.Boolean);
    assert.ok(Ferret1.path('extra') instanceof mongoose.Schema.Types.Mixed);
    assert.ok(Ferret1.path('obj') instanceof mongoose.Schema.Types.Mixed);
    assert.ok(Ferret1.path('buf') instanceof mongoose.Schema.Types.Buffer);
    assert.ok(Ferret1.path('Buf') instanceof mongoose.Schema.Types.Buffer);
    done();
  });
});