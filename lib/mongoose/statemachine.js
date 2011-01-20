function StateMachine () {
  this.paths = {};
  this.states = {};
}

StateMachine.ctor = function () {
  var states = [].slice.call(arguments);
  var ctor = function () {
    StateMachine.apply(this, arguments);
    this.stateNames = states;
    var i = states.length
      , state;
    while (i--) {
      state = states[i];
      this.states[state] = {};
    }
  };

  ctor.prototype.__proto__ = StateMachine.prototype;
  states.forEach( function (state) {
    /**
     * Changes the path's state to state.
     */
    ctor.prototype[state] = function (path) {
      this._changeState(path, state);
    }
  });
  return ctor;
};

StateMachine.prototype = {
  /**
   * This function is wrapped by the state change functions:
   * - `require(path)`
   * - `modify(path)`
   * - `init(path)`
   * @api private
   */

  _changeState: function (path, nextState) {
    var prevState = this.paths[path]
      , prevBucket = this.states[prevState];
    delete this.paths[path];
    if (prevBucket) delete prevBucket[path];

    this.paths[path] = nextState;
    this.states[nextState][path] = true;
  },

  stateOf: function (path) {
    return this.paths[path];
  },

  /**
   * Checks to see if at least one path is in the states passed in via `arguments`
   * e.g., this.some('required', 'inited')
   * @param {String} state that we want to check for.
   * @api public
   */

  some: function () {
    var self = this;
    return Array.prototype.some.call(arguments.length ? arguments : this.stateNames, function (state) {
      return Object.keys(self.states[state]).length;
    });
  },

  /**
   * This function builds the functions that get assigned to `forEach` and `map`,
   * since both of those methods share a lot of the same logic.
   *
   * @param {String} iterMethod is either 'forEach' or 'map'
   * @return {Function}
   * @api private
   */

  _iter: function (iterMethod) {
    return function () {
      var numArgs = arguments.length
        , states = [].slice.call(arguments, 0, numArgs-1)
        , callback = arguments[arguments.length-1];
      if (!states.length) states = this.stateNames;
      var self = this;
      var paths = states.reduce( function (paths, state) {
        return paths.concat(Object.keys(self.states[state]));
        
      }, []);
      return paths[iterMethod]( function (path) {
        return callback(path);
      });
    };
  },

  /**
   * I iterate over the paths that belong to one of the parameter states.
   *
   * The function profile can look like:
   * this.forEach(state1, fn);         // iterates over all paths in state1
   * this.forEach(state1, state2, fn); // iterates over all paths in state1 or state2
   * this.forEach(fn);                 // iterates over all paths in all states
   *
   * @param {String} [state]
   * @param {String} [state]
   * @param {Function} callback
   * @api public
   */

  forEach: function () {
    this.forEach = this._iter('forEach');
    return this.forEach.apply(this, arguments);
  },

  /**
   * I map over the paths that belong to one of the parameter states.
   *
   * The function profile can look like:
   * this.forEach(state1, fn);         // iterates over all paths in state1
   * this.forEach(state1, state2, fn); // iterates over all paths in state1 or state2
   * this.forEach(fn);                 // iterates over all paths in all states
   *
   * @param {String} [state]
   * @param {String} [state]
   * @param {Function} callback
   * @return {Array}
   * @api public
   */

  map: function () {
    this.map = this._iter('map');
    return this.map.apply(this, arguments);
  }
};

module.exports = StateMachine;
