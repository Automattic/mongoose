
var mongoose = require('../')
  , Schema = mongoose.Schema;

var db = mongoose.connect('localhost', 'testing_bench');

var DocSchema = new Schema({
    title: String
});

var AllSchema = new Schema({
    string: { type: String, required: true }
  , number: { type: Number, min: 10 }
  , date  : Date
  , bool  : Boolean
  , buffer: Buffer
  , objectid: Schema.ObjectId
  , array : Array
  , strings: [String]
  , numbers: [Number]
  , dates  : [Date]
  , bools  : [Boolean]
  , buffers: [Buffer]
  , objectids: [Schema.ObjectId]
  , docs     : { type: [DocSchema], validate: function () { return true }}
});

var A = mongoose.model('A', AllSchema);

var methods = [];
//methods.push(function (a, cb) {
  //A.findOne({ _id: a._id }, cb);
//}); // 2 MB
//methods.push(function (a, cb) {
  //A.find({ _id: a._id, bool: a.bool }, cb);
//}); // 3.8 MB
//methods.push(function (a, cb) {
  //A.findById(a._id, cb);
//}); // 4.6 MB
//methods.push(function (a, cb) {
  //A.where('number', a.number).sort('_id', -1).limit(10).run(cb)
//}); // 4.8 MB
methods.push(function (a, cb) {
  a.where('date', a.date).select('string').limit(10).run(cb)
}); // 3.5 mb
//methods.push(function (a, cb) {
  //A.where('date', a.date).select('string', 'bool').asc('date').limit(10).run(cb)
//}); // 3.5 MB
//methods.push(function (a, cb) {
  //A.find('date', a.date).where('array').$in(3).limit(10).run(cb)
//}); // 1.82 MB
//methods.push(function (a, cb) {
  //A.update({ _id: a._id }, { $addToset: { array: "heeeeello" }}, cb);
//}); // 3.32 MB
//methods.push(function (a, cb) {
  //A.remove({ _id: a._id }, cb);
//}); // 3.32 MB
//methods.push(function (a, cb) {
  //A.find().where('objectids').exists().only('dates').limit(10).exec(cb);
//}); // 3.32 MB
//methods.push(function (a, cb) {
  //A.count({ strings: a.strings[2], number: a.number }, cb);
//}); // 3.32 MB

// bench the normal way
// the try building the doc into the document prototype
// and using inheritance and bench that 
//
// also, bench using listeners for each subdoc vs one 
// listener that knows about all subdocs and notifies
// them.

var started = process.memoryUsage();
//console.error(started);
var start = new Date;
var total = 10000;
var i = total;

mongoose.connection.on('open', function () {
  mongoose.connection.db.dropDatabase(function () {

    ;(function cycle () {
      if (0 === i--) return done();

      var a = new A({
          string: "hello world"
        , number: 444848484
        , date: new Date
        , bool: true
        , buffer: new Buffer(0)
        , objectid: new mongoose.Types.ObjectId()
        , array: [4,{},[],"asdfa"]
        , strings: ["one","two","three","four"]
        , numbers:[72,6493,83984643,348282.55]
        , dates:[new Date, new Date, new Date]
        , bools:[true, false, false, true, true]
        , buffers: [new Buffer([33]), new Buffer([12])]
        , objectids: [new mongoose.Types.ObjectId]
        , docs: [ {title: "yo"}, {title:"nowafasdi0fas asjkdfla fa" }]
      });

      a.save(function (err) {
        methods[Math.random()*methods.length|0](a, function () {
          process.nextTick(cycle);
        })
      });

      //if (i%2)
        //a.toObject({ depopulate: true });
      //else
        //a._delta();

      if (!(i%40)) {
        var u = process.memoryUsage();
        console.error('rss: %d, vsize: %d, heapTotal: %d, heapUsed: %d',
            u.rss, u.vsize, u.heapTotal, u.heapUsed);
      }
    })()

    function done () {
      var time= (new Date - start)/1000;
      console.error('took %d seconds for %d docs (%d dps)', time, total, total/time);
      var used = process.memoryUsage();
      console.error(((used.vsize - started.vsize) / 1048576)+' MB');

      //console.error(a.toObject({depopulate:true}));

      mongoose.connection.db.dropDatabase(function () {
        mongoose.connection.close();
      });
    }

  // --trace-opt --trace-deopt --trace-bailout 
  })
})
