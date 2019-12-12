'use strict';

/*!
 * ignore
 */

const MongooseMap = require('../types/map');
const SchemaMapOptions = require('../options/SchemaMapOptions');
const SchemaType = require('../schematype');

/*!
 * ignore
 */

class Map extends SchemaType {
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

      if (val instanceof global.Map) {
        for (const key of val.keys()) {
          map.$init(key, map.$__schemaType.cast(val.get(key), doc, true));
        }
      } else {
        for (const key of Object.keys(val)) {
          map.$init(key, map.$__schemaType.cast(val[key], doc, true));
        }
      }

      return map;
    }

    return new MongooseMap(val, this.path, doc, this.$__schemaType);
  }

  clone() {
    const schematype = super.clone();

    if (this.$__schemaType != null) {
      schematype.$__schemaType = this.$__schemaType.clone();
    }
    return schematype;
  }
}

Map.prototype.OptionsConstructor = SchemaMapOptions;

module.exports = Map;
