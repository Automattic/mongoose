
module.exports = exports = function (str) {
  var parts = str.replace(/\.js$/, '').split('/');
  return parts.join('_');
}
