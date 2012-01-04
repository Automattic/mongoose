
var mongoose = require('../')
  , utils = require('../lib/utils')
  , clone = utils.clone
  , Schema = mongoose.Schema

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
  , s: { nest: String }
});

var A = mongoose.model('A', AllSchema);
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
  , s: { nest: 'hello there everyone!' }
});

var start = new Date;
var total = 100000;
var i = total;

for (var i = 0, len = total; i < len; ++i) {
  a.toObject({ depopulate: true });
}

var time= (new Date - start)/1000;
console.error('took %d seconds for %d docs (%d dps)', time, total, total/time);
var used = process.memoryUsage();

// --trace-opt --trace-deopt --trace-bailout
