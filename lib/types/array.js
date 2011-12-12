
/**
 * Module dependencies.
 */

var EmbeddedDocument = require('./embedded');
var Document = require('../document');
var ObjectId = require('./objectid');
var fs = require('fs');
var vm = require('vm');

/**
 * Subclass array from another context for perf.
 * __proto__ hacking at runtime is slower.
 */

var script = vm.createScript(
    fs.readFileSync(__dirname +'/_subarray.js', 'utf8')
  , 'subarray.js'
)

var scope = {
    EmbeddedDocument: EmbeddedDocument
  , Document: Document
  , ObjectId: ObjectId
  , exports: null
  , console: console
  , Date: Date
  , _Array: Array
}

script.runInNewContext(scope);
var SubArray = scope.exports;

/**
 * Mongoose Array constructor.
 * Values always have to be passed to the constructor to initialize, since
 * otherwise MongooseArray#push will mark the array as modified to the parent.
 *
 * @param {Array} values
 * @param {String} key path
 * @param {Document} parent document
 * @api private
 * @see http://bit.ly/f6CnZU
 */

function MongooseArray (values, path, doc) {
  var arr = new SubArray;
  Array.prototype.push.apply(arr, values);

  arr._atomics = {};
  arr.validators = [];
  arr._path = path;

  if (doc) {
    arr._parent = doc;
    arr._schema = doc.schema.path(path);
  }

  return arr;
};

SubArray.prototype.__proto__ = MongooseArray.prototype = new Array;

/**
 * Module exports.
 */

module.exports = exports = MongooseArray;
exports.SubArray = SubArray;
