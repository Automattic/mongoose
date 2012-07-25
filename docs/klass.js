
module.exports = exports = function (str) {
  var parts = str.replace(/\.js$/, '').split('/');
  parts.shift();
  return parts.join('_');
}
