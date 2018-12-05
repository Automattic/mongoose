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

  cast(val, doc, init) {
    if (val instanceof MongooseMap) {
      return val;
    }

    if (init) {
      const map = new MongooseMap({}, this.path, doc, this.$__schemaType);

      for (const key of Object.keys(val)) {
        map.$__set(key, this.$__schemaType.cast(val[key], doc, true));
      }

      return map;
    }

    return new MongooseMap(val, this.path, doc, this.$__schemaType);
  }
}

module.exports = SchemaMap;
