
var start = require('./common')
  , mongoose = start.mongoose
  , Query = mongoose.Query
  , assert = require('assert')

module.exports = {
  'aliased methods from 2.x exist': function () {
    mongoose.compat = true;

    var methods = ('or nor gt gte lt lte ne in nin all regex '
                + 'size maxDistance mod near exists elemMatch '
                + 'within box center centerSphere slice').split(' ');

    methods.forEach(function assign (method) {
      assert.equal(Query.prototype['$' + method], Query.prototype[method]);
    })

    assert.equal(Query.prototype.run, Query.prototype.exec);
    assert.equal(Query.prototype.notEqualTo, Query.prototype.ne);
    assert.equal(Query.prototype.wherein, Query.prototype.within);
    assert.equal(Query.prototype.fields, Query.prototype.select);

    assert.equal('function', typeof Query.prototype.asc);
    assert.equal('function', typeof Query.prototype.desc);

    assert.equal(mongoose.createSetConnection, mongoose.createConnection);
    assert.equal(mongoose.connectSet, mongoose.connect);

    // gone methods
    assert.throws(function () {
      Query.prototype.only();
    }, /Query#only has been removed/);

    assert.throws(function () {
      Query.prototype.exclude();
    }, /Query#exclude has been removed/);

    assert.throws(function () {
      Query.prototype.each();
    }, /Query#each has been removed/);

    mongoose.compat = false;

    var methods = ('or nor gt gte lt lte ne in nin all regex '
                + 'size maxDistance mod near exists elemMatch '
                + 'within box center centerSphere slice').split(' ');

    methods.forEach(function assign (method) {
      assert.equal(Query.prototype['$' + method], undefined);
    })

    assert.equal(Query.prototype.run, undefined);
    assert.equal(Query.prototype.notEqualTo, undefined);
    assert.equal(Query.prototype.wherein, undefined);
    assert.equal(Query.prototype.fields, undefined);

    assert.equal('undefined', typeof Query.prototype.asc);
    assert.equal('undefined', typeof Query.prototype.desc);

    assert.equal(mongoose.createSetConnection, undefined);
    assert.equal(mongoose.connectSet, undefined);
    assert.equal(Query.prototype.only, undefined);
    assert.equal(Query.prototype.exclude, undefined);
    assert.equal(Query.prototype.each, undefined);
  }
}
