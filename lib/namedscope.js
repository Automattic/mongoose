var Query = require('./query');
function NamedScope () {}

NamedScope.prototype.query;

NamedScope.prototype.where = function () {
  var q = this.query || (this.query = new Query());
  q.where.apply(q, arguments);
  return q;
};

/**
 * @param {NamedScope} target
 * @param {Object} getters
 */
NamedScope.prototype.decorate = function (target, getters) {
  var name = this.name
    , block = this.block
    , query = this.query;
  if (block) {
    if (block.length === 0) {
      Object.defineProperty(target, name, {
        get: getters.block0(block)
      });
    } else {
      target[name] = getters.blockN(block);
    }
  } else {
    Object.defineProperty(target, name, {
      get: getters.basic(query)
    });
  }
};

NamedScope.prototype.compile = function (model) {
  var allScopes = this.scopesByName
    , scope;
  for (var k in allScopes) {
    scope = allScopes[k];
    scope.decorate(model, {
      block0: function (block) {
        return function () {
          var cquery = this._cumulativeQuery || (this._cumulativeQuery = new Query().bind(this));
          block.call(cquery);
          return this;
        };
      },
      blockN: function (block) {
        return function () {
          var cquery = this._cumulativeQuery || (this._cumulativeQuery = new Query().bind(this));
          block.apply(cquery, arguments);
          return this;
        };
      },
      basic: function (query) {
        return function () {
          var cquery = this._cumulativeQuery || (this._cumulativeQuery = new Query().bind(this));
          cquery.find(query);
          return this;
        };
      }
    });
  }
};

module.exports = NamedScope;
