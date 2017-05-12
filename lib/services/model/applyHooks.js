'use strict';

var PromiseProvider = require('../../promise_provider');
var VersionError = require('../../error').VersionError;

module.exports = applyHooks;

/*!
 * Register hooks for this model
 *
 * @param {Model} model
 * @param {Schema} schema
 */

function applyHooks(model, schema) {
  var q = schema && schema.callQueue;
  var toWrapEl;
  var len;
  var i;
  var j;
  var pointCut;
  var keys;
  var newName;
  if (!q.length) {
    return;
  }

  // we are only interested in 'pre' hooks, and group by point-cut
  var toWrap = { post: [] };
  var pair;

  for (i = 0; i < q.length; ++i) {
    pair = q[i];
    if (pair[0] !== 'pre' && pair[0] !== 'post' && pair[0] !== 'on') {
      continue;
    }
    var args = [].slice.call(pair[1]);
    pointCut = pair[0] === 'on' ? 'post' : args[0];
    if (!(pointCut in toWrap)) {
      toWrap[pointCut] = {post: [], pre: []};
    }
    if (pair[0] === 'post') {
      toWrap[pointCut].post.push(args);
    } else if (pair[0] === 'on') {
      toWrap[pointCut].push(args);
    } else {
      toWrap[pointCut].pre.push(args);
    }
  }

  // 'post' hooks are simpler
  len = toWrap.post.length;
  toWrap.post.forEach(function(args) {
    model.on.apply(model, args);
  });
  delete toWrap.post;

  // 'init' should be synchronous on subdocuments
  if (toWrap.init && (model.$isSingleNested || model.$isArraySubdocument)) {
    if (toWrap.init.pre) {
      toWrap.init.pre.forEach(function(args) {
        model.prototype.$pre.apply(model.prototype, args);
      });
    }
    if (toWrap.init.post) {
      toWrap.init.post.forEach(function(args) {
        model.prototype.$post.apply(model.prototype, args);
      });
    }
    delete toWrap.init;
  }
  if (toWrap.set) {
    // Set hooks also need to be sync re: gh-3479
    newName = '$__original_set';
    model.prototype[newName] = model.prototype.set;
    if (toWrap.set.pre) {
      toWrap.set.pre.forEach(function(args) {
        model.prototype.$pre.apply(model.prototype, args);
      });
    }
    if (toWrap.set.post) {
      toWrap.set.post.forEach(function(args) {
        model.prototype.$post.apply(model.prototype, args);
      });
    }
    delete toWrap.set;
  }

  keys = Object.keys(toWrap);
  len = keys.length;
  for (i = 0; i < len; ++i) {
    pointCut = keys[i];
    // this is so we can wrap everything into a promise;
    newName = ('$__original_' + pointCut);
    if (!model.prototype[pointCut]) {
      return;
    }
    if (!model.prototype[pointCut].$originalFunction) {
      model.prototype[newName] = model.prototype[pointCut];
    }
    model.prototype[pointCut] = (function(_newName) {
      return function wrappedPointCut() {
        var Promise = PromiseProvider.get();

        var _this = this;
        var args = [].slice.call(arguments);
        var lastArg = args.pop();
        var fn;
        var originalError = new Error();
        var $results;
        if (lastArg && typeof lastArg !== 'function') {
          args.push(lastArg);
        } else {
          fn = lastArg;
        }

        var promise = new Promise.ES6(function(resolve, reject) {
          args.push(function(error) {
            if (error) {
              // gh-2633: since VersionError is very generic, take the
              // stack trace of the original save() function call rather
              // than the async trace
              if (error instanceof VersionError) {
                error.stack = originalError.stack;
              }
              if (!fn) {
                _this.$__handleReject(error);
              }
              reject(error);
              return;
            }

            // There may be multiple results and promise libs other than
            // mpromise don't support passing multiple values to `resolve()`
            $results = Array.prototype.slice.call(arguments, 1);
            resolve.apply(promise, $results);
          });

          _this[_newName].apply(_this, args);
        });
        if (fn) {
          if (this.constructor.$wrapCallback) {
            fn = this.constructor.$wrapCallback(fn);
          }
          promise.then(
            function() {
              process.nextTick(function() {
                fn.apply(null, [null].concat($results));
              });
            },
            function(error) {
              process.nextTick(function() {
                fn(error);
              });
            });
        }
        return promise;
      };
    })(newName);
    model.prototype[pointCut].$originalFunction = newName;

    toWrapEl = toWrap[pointCut];
    var _len = toWrapEl.pre.length;
    for (j = 0; j < _len; ++j) {
      args = toWrapEl.pre[j];
      args[0] = newName;
      model.prototype.$pre.apply(model.prototype, args);
    }

    _len = toWrapEl.post.length;
    for (j = 0; j < _len; ++j) {
      args = toWrapEl.post[j];
      args[0] = newName;
      model.prototype.$post.apply(model.prototype, args);
    }
  }
}
