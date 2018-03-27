/*!
 * ignore
 */

const MongooseMap = require('../types/map');
const SchemaType = require('../schematype');

/*!
 * ignore
 */

class SchemaMap extends SchemaType {
  constructor(key, options) {
    super(key, options, 'Map');
  }

  cast(val, doc) {
    if (val instanceof MongooseMap) {
      return val;
    }
    return new MongooseMap(val, this.path, doc);
  }
}

module.exports = SchemaMap;
