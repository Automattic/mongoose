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

  set(option, value) {
    return SchemaType.set(option, value);
  }

  cast(val, doc, init) {
    if (val instanceof MongooseMap) {
      return val;
    }

    const path = this.path;

    if (init) {
      const map = new MongooseMap({}, path, doc, this.$__schemaType);

      if (val instanceof global.Map) {
        for (const key of val.keys()) {
          let _val = val.get(key);
          if (_val == null) {
            _val = map.$__schemaType._castNullish(_val);
          } else {
            _val = map.$__schemaType.cast(_val, doc, true, null, { path: path + '.' + key });
          }
          map.$init(key, _val);
        }
      } else {
        for (const key of Object.keys(val)) {
          let _val = val[key];
          if (_val == null) {
            _val = map.$__schemaType._castNullish(_val);
          } else {
            _val = map.$__schemaType.cast(_val, doc, true, null, { path: path + '.' + key });
          }
          map.$init(key, _val);
        }
      }

      return map;
    }

    return new MongooseMap(val, path, doc, this.$__schemaType);
  }

  clone() {
    const schematype = super.clone();

    if (this.$__schemaType != null) {
      schematype.$__schemaType = this.$__schemaType.clone();
    }
    return schematype;
  }
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
Map.schemaName = 'Map';

Map.prototype.OptionsConstructor = SchemaMapOptions;

Map.defaultOptions = {};

module.exports = Map;
