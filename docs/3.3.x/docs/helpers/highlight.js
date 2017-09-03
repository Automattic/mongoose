
var h = require('highlight.js')

function hl (str) {
  str = str.replace(/\\n/g, '\n');
  var ret = h.highlight('javascript', str).value;
  var code = '<pre><code class="javascript">' + ret+ '</code></pre>';
  return code;
}

module.exports = hl;
