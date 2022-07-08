'use strict';

/*!
 * Module dependencies
 */

const dox = require('dox');
const fs = require('fs');
const md = require('marked');

const files = [
  'lib/index.js',
  'lib/schema.js',
  'lib/connection.js',
  'lib/document.js',
  'lib/model.js',
  'lib/query.js',
  'lib/cursor/QueryCursor.js',
  'lib/aggregate.js',
  'lib/cursor/AggregationCursor.js',
  'lib/schematype.js',
  'lib/virtualtype.js',
  'lib/error/index.js',
  'lib/schema/array.js',
  'lib/schema/documentarray.js',
  'lib/schema/SubdocumentPath.js',
  'lib/options/SchemaTypeOptions.js',
  'lib/options/SchemaArrayOptions.js',
  'lib/options/SchemaBufferOptions.js',
  'lib/options/SchemaDateOptions.js',
  'lib/options/SchemaNumberOptions.js',
  'lib/options/SchemaObjectIdOptions.js',
  'lib/options/SchemaStringOptions.js',
  'lib/types/DocumentArray/methods/index.js',
  'lib/types/subdocument.js',
  'lib/types/ArraySubdocument.js',
  'lib/types/buffer.js',
  'lib/types/decimal128.js',
  'lib/types/map.js'
];

module.exports = {
  docs: [],
  github: 'https://github.com/Automattic/mongoose/blob/',
  title: 'API docs',
  api: true
};

const out = module.exports.docs;

const combinedFiles = [];
for (const file of files) {
  try {
    const comments = dox.parseComments(fs.readFileSync(`./${file}`, 'utf8'), { raw: true });
    comments.file = file;
    combinedFiles.push(comments);
  } catch (err) {
    // show log of which file has thrown a error for easier debugging
    console.error("Error while trying to parseComments for ", file);
    throw err;
  }
}

parse();

/**
 * @typedef {Object} PropContext
 * @property {boolean} [isStatic] Defines wheter the current property is a static property (not mutually exlusive with "isInstance")
 * @property {boolean} [isInstance] Defines wheter the current property is a instance property (not mutually exlusive with "isStatic")
 * @property {boolean} [isFunction] Defines wheter the current property is meant to be a function
 * @property {string} [constructor] Defines the Constructor (or rather path) the current property is on
 * @property {boolean} [constructorWasUndefined] Defined wheter the "constructor" property was defined by "dox", but was set to "undefined"
 * @property {string} [type] Defines the type the property is meant to be
 * @property {string} [name] Defines the current Properties name
 * @property {Object} [return] The full object for a "@return" jsdoc tag
 * @property {string} [string] Defines the full string the property will be listed as
 * @property {string} [anchorId] Defines the Anchor ID to be used for linking
 * @property {string} [description] Defines the Description the property will be listed with
 * @property {string} [deprecated] Defines wheter the current Property is signaled as deprecated
 */

function parse() {
  for (const props of combinedFiles) {
    let name = props.file.
      replace('lib/', '').
      replace('.js', '').
      replace('/index', '').
      replace('/methods', '');
    const lastSlash = name.lastIndexOf('/');
    const fullName = name;
    name = name.substr(lastSlash === -1 ? 0 : lastSlash + 1);
    if (name === 'core_array') {
      name = 'array';
    }
    if (fullName === 'schema/array') {
      name = 'SchemaArray';
    }
    if (name === 'documentarray') {
      name = 'DocumentArrayPath';
    }
    if (name === 'DocumentArray') {
      name = 'MongooseDocumentArray';
    }
    const data = {
      name: name.charAt(0).toUpperCase() === name.charAt(0) ? name : name.charAt(0).toUpperCase() + name.substr(1),
      props: []
    };

    for (const prop of props) {
      if (prop.ignore || prop.isPrivate) {
        continue;
      }
     
      /** @type {PropContext} */
      const ctx = prop.ctx || {};

      // somehow in "dox", it is named "receiver" sometimes, not "constructor"
      // this is used as a fall-back if the handling below does not overwrite it
      if ("receiver" in ctx) {
        ctx.constructor = ctx.receiver;
        delete ctx.receiver;
      }

      // in some cases "dox" has "ctx.constructor" defined but set to "undefined", which will later be used for setting "ctx.string"
      if ("constructor" in ctx && ctx.constructor === undefined) {
        ctx.constructorWasUndefined = true;
      }

      // helper function to keep translating array types to string consistent
      function convertTypesToString(types) {
        return Array.isArray(types) ? types.join('|') : types
      }

      for (const tag of prop.tags) {
        switch (tag.type) {
          case 'receiver':
            console.warn(`Found "@receiver" tag in ${ctx.constructor} ${ctx.name}`);
            break;
          case 'property':
            ctx.type = 'property';

            // using "name" over "string" because "string" also contains the type and maybe other stuff
            ctx.name = tag.name;
            // only assign "type" if there are types
            if (tag.types.length > 0) {
              ctx.type = convertTypesToString(tag.types);
            }

            break;
          case 'type':
            ctx.type = convertTypesToString(tag.types);
            break;
          case 'static':
            ctx.type = 'property';
            ctx.isStatic = true;
            // dont take "string" as "name" from here, because jsdoc definitions of "static" do not have parameters, also its defined elsewhere anyway
            // ctx.name = tag.string;
            break;
          case 'function':
            ctx.type = 'function';
            ctx.isStatic = true;
            ctx.name = tag.string;
            // extra parameter to make function definitions independant of where "@function" is defined
            // like "@static" could have overwritten "ctx.string" again if defined after "@function"
            ctx.isFunction = true;
            break;
          case 'return':
            tag.description = tag.description ?
              md.parse(tag.description).replace(/^<p>/, '').replace(/<\/p>\n?$/, '') :
              '';

            // dox does not add "void" / "undefined" to types, so in the documentation it would result in a empty "«»"
            if (tag.string.includes('void') || tag.string.includes('undefined')) {
              tag.types.push("void");
            }

            ctx.return = tag;
            break;
          case 'inherits':
            ctx[tag.type] = tag.string;
            break;
          case 'event':
          case 'param':
            ctx[tag.type] = (ctx[tag.type] || []);
            // the following is required, because in newer "dox" version "null" is not included in "types" anymore, but a seperate property
            if (tag.nullable) {
              tag.types.push('null');
            }
            if (tag.types) {
              tag.types = convertTypesToString(tag.types);
            }
            ctx[tag.type].push(tag);
            if (tag.name != null && tag.name.startsWith('[') && tag.name.endsWith(']') && tag.name.includes('.')) {
              tag.nested = true;
            }
            tag.description = tag.description ?
              md.parse(tag.description).replace(/^<p>/, '').replace(/<\/p>$/, '') :
              '';
            break;
          case 'method':
            ctx.type = 'method';
            ctx.name = tag.string;
            ctx.isFunction = true;
            break;
          case 'memberOf':
            ctx.constructor = tag.parent;
            break;
          case 'constructor':
            ctx.string = tag.string;
            ctx.name = tag.string;
            ctx.isFunction = true;
            break;
          case 'instance':
            ctx.isInstance = true;
            break;
          case 'deprecated':
            ctx.deprecated = true;
            break;
        }
      }

      if (ctx.isInstance && ctx.isStatic) {
        console.warn(`Property "${ctx.name}" in "${ctx.constructor}" has both instance and static JSDOC markings (most likely both @instance and @static)! (File: "${props.file}")`);
      }

      // the following if-else-if statement is in this order, because there are more "instance" methods thans static
      // the following condition will be true if "isInstance = true" or if "isInstance = false && isStatic = false" AND "ctx.string" are empty or not defined
      // if "isStatic" and "isInstance" are falsy and "ctx.string" is not falsy, then rely on the "ctx.string" set by "dox"
      if (ctx.isInstance || (!ctx.isStatic && !ctx.isInstance && (!ctx.string || ctx.constructorWasUndefined))) {
        ctx.string = `${ctx.constructor}.prototype.${ctx.name}`;
      } else if (ctx.isStatic) {
        ctx.string = `${ctx.constructor}.${ctx.name}`;
      }

      // add "()" to the end of the string if function
      if ((ctx.isFunction || ctx.type === "method") && !ctx.string.endsWith("()")) {
        ctx.string = ctx.string + "()";
      }

      // Backwards compat anchors
      if (typeof ctx.constructor === 'string') {
        ctx.anchorId = `${ctx.constructor.toLowerCase()}_${ctx.constructor}-${ctx.name}`;
      } else if (typeof ctx.receiver === 'string') {
        ctx.anchorId = `${ctx.receiver.toLowerCase()}_${ctx.receiver}.${ctx.name}`;
      } else {
        ctx.anchorId = `${ctx.name.toLowerCase()}_${ctx.name}`;
      }

      ctx.description = prop.description.full.
        replace(/<br \/>/ig, ' ').
        replace(/&gt;/ig, '>');
      ctx.description = md.parse(ctx.description);

      data.props.push(ctx);
    }

    data.props.sort(function(a, b) {
      if (a.string < b.string) {
        return -1;
      } else {
        return 1;
      }
    });

    if (props.file.startsWith('lib/options')) {
      data.hideFromNav = true;
    }

    data.file = props.file;
    data.editLink = 'https://github.com/Automattic/mongoose/blob/master/' +
      props.file;

    out.push(data);
  }
}
