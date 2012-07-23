
var types = {};
types.Object = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object';
types.Boolean = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Boolean'
types.String = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/String'
types.Array = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array'
types.Number = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Number'
types.Date = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date'
types.Function = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date'
types.RegExp = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/RegExp'
types.Error = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error'
types['undefined'] = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/undefined'

module.exports= function (type) {
  if (types[type]) {
    return '<a href="' + types[type] + '">' + type + '</a>';
  }
  return '<a href="#' + type + '">' + type + '</a>';
}
