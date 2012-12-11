
module.exports = exports = function (str, char) {
  if ('string' != typeof str) return str;
  return encodeURIComponent(str.replace(/\.js$/, '').replace(/\.|#/g, char || '-'));
}
