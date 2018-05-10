'use strict';

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
    this.$isSchemaMap = true;
  }

  cast(val, doc) {
    if (val instanceof MongooseMap) {
      return val;
    }

    return new MongooseMap(val, this.path, doc, this.$__schemaType);
  }
}

module.exports = SchemaMap;
