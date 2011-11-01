
var mongoose = require('../')
  , Schema = mongoose.Schema;

var DocSchema = new Schema({
    title: String
});

var AllSchema = new Schema({
    string: String
  , number: Number
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
  , docs     : [DocSchema]
});

var A = mongoose.model('A', AllSchema);

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
while (i--) {
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
  if (i%2)
    a.toObject({ depopulate: true });
  else
    a._delta();
}
var time= (new Date - start)/1000;
console.error('took %d seconds for %d docs (%d dps)', time, total, total/time);
var used = process.memoryUsage();
console.error(((used.vsize - started.vsize) / 1048576)+' MB');

//console.error(a.toObject({depopulate:true}));

// --trace-opt --trace-deopt --trace-bailout 
