
/**
 * Module dependencies.
 */

var start = require('../../common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , Schema = mongoose.Schema;

describe('drivers: native:', function(){
  describe('connection', function(){
    it('rejects invalid options combos', function(done){
      var m = new mongoose.Mongoose;

      'journal fsync safe'.split(' ').forEach(function (type) {
        ;[-1,0].forEach(function(val){

          var inner = {};
          inner.w = val;
          var opts = { db: inner };

          var q = type + '=true'
          assert.throws(function(){
            m.connect('mongodb://localhost?' + q, opts);
          }, /Invalid writeConcern/, JSON.stringify(opts));

          assert.throws(function(){
            m.connect('mongodb://localhost,another:12345?' + q, opts);
          }, /Invalid writeConcern/, JSON.stringify(opts));

          q += '&w=' + val;
          assert.throws(function(){
            m.connect('mongodb://localhost?' + q);
          }, /Invalid writeConcern/, JSON.stringify(opts));
          assert.throws(function(){
            m.connect('mongodb://localhost,yup?' + q);
          }, /Invalid writeConcern/, JSON.stringify(opts));

          inner[type] = true;

          assert.throws(function(){
            m.connect('localhost', opts);
          }, /Invalid writeConcern/, JSON.stringify(opts));

          assert.throws(function(){
            m.connect('mongodb://localhost,repl', opts);
          }, /Invalid writeConcern/, JSON.stringify(opts));

        });
      })

      done();
    })
  })
})
