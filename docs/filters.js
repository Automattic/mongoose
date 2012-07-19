
var hl = require('highlight.js')

module.exports = exports = function (jade) {
  // add highlighting filter to jade

  jade.filters.js = function (str) {
    var ret = hl.highlight('javascript', str.replace(/\\n/g, '\n')).value;
    var code = '<pre><code class="javascript">' + ret.replace(/\n/g, '\\n') + '</code></pre>';
    return code;
  }

  jade.filters.bash = function (str) {
    var ret = hl.highlight('bash', str.replace(/\\n/g, '\n')).value;
    var code = '<pre><code class="bash">' + ret + '</code></pre>';
    return  code
  }

}
