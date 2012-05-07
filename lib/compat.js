
// enable 2.x backwards compatibility

module.exports = exports = function (mongoose) {
  var compat = mongoose.compat;
  var Query = require('./query');

  // add aliases
  var methods = ('or nor gt gte lt lte ne in nin all regex '
              +  'size maxDistance mod near exists elemMatch '
              +  'within box center centerSphere slice').split(' ');

  if (compat) {
    methods.forEach(function assign (method) {
      Query.prototype['$' + method] = Query.prototype[method];
    })

    Query.prototype.run = Query.prototype.exec;
    Query.prototype.notEqualTo = Query.prototype.ne;
    Query.prototype.wherein = Query.prototype.within;
    Query.prototype.fields = Query.prototype.select;

    Query.prototype.asc = makeSort(1);
    Query.prototype.desc = makeSort(-1);

    mongoose.createSetConnection = mongoose.createConnection;
    mongoose.connectSet = mongoose.connect;

    // gone methods
    Query.prototype.only = notExists('only', 'Query#select');
    Query.prototype.exclude = notExists('exclude', 'Query#select');
    Query.prototype.each = notExists('each', 'Query#stream');
  } else {
    methods.forEach(function assign (method) {
      delete Query.prototype['$' + method];
    })

    delete Query.prototype.run;
    delete Query.prototype.notEqualTo;
    delete Query.prototype.wherein;
    delete Query.prototype.fields;
    delete Query.prototype.asc;
    delete Query.prototype.desc;
    delete Query.prototype.only;
    delete Query.prototype.exclude;
    delete Query.prototype.each;

    delete mongoose.createSetConnection;
    delete mongoose.connectSet;
  }
}

/**
 * @ignore
 */

function makeSort (dir) {
  return function () {
    var sort = this.options.sort || (this.options.sort = []);
    for (var i = 0, len = arguments.length; i < len; ++i) {
      sort.push([arguments[i], dir]);
    }
    return this;
  }
}

/**
 * @ignore
 */

function notExists (name, suggestion) {
  return function () {
    throw new Error('Query#' + name + ' has been removed. '
                  + 'Use ' + suggestion + ' instead.');
  }
}

