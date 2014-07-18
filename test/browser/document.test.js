var em = new mongoose.Schema({ title: String, body: String });
em.virtual('works').get(function () {
  return 'em virtual works'
});

var schema = new mongoose.Schema({
  test    : String,
  oids    : [mongoose.Schema.ObjectId],
  numbers : [Number],
  nested  : {
    age   : Number,
    cool  : mongoose.Schema.ObjectId,
    deep  : { x: String },
    path  : String,
    setr  : String
  },
  nested2 : {
    nested: String,
    yup   : {
      nested  : Boolean,
      yup     : String,
      age     : Number
    }
  },
  em: [em],
  date: Date
});

describe('browser:document', function() {
  it('work', function(done) {
    var obj = {
      test    : 'test',
      oids    : [],
      nested  : {
        age   : 5,
        cool  : mongoose.Types.ObjectId.createFromHexString('4c6c2d6240ced95d0e00003c'),
        path  : 'my path'
      }
    };

    var doc = new mongoose.Document(obj, schema);

    console.log(JSON.stringify(doc));
    assert.equal('test', doc._doc.test);
    done();
  });
});