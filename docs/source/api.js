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
  'lib/schema/boolean.js',
  'lib/schema/buffer.js',
  'lib/schema/number.js',
  'lib/schema/objectid.js',
  'lib/schema/string.js',
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
  'lib/types/map.js',
  'lib/types/array/methods/index.js'
];

/** @type {Map.<string, DocsObj>} */
const out = module.exports.docs = new Map();

// add custom matchers to dox, to recognize things it does not know about
// see https://github.com/tj/dox/issues/198
{
  // Some matchers need to be in a specific order, like the "prototype" matcher must be before the static matcher (and inverted because "unshift")

  // "unshift" is used, because the first function to return a object from "contextPatternMatchers" is used (and we need to "overwrite" those specific functions)

  // push a matcher to recognize "Class.fn = async function" as a method
  dox.contextPatternMatchers.unshift(function(str) {
    const match = /^\s*([\w$.]+)\s*\.\s*([\w$]+)\s*=\s*(?:async\s+)?function/.exec(str);
    if (match) {
      return {
        type: 'method',
        receiver: match[1],
        name: match[2],
        string: match[1] + '.' + match[2] + '()'
      };
    }
  });

  // push a matcher to recognize "Class.prototype.fn = async function" as a method
  dox.contextPatternMatchers.unshift(function(str) {
    const match = /^\s*([\w$.]+)\s*\.\s*prototype\s*\.\s*([\w$]+)\s*=\s*(?:async\s+)?function/.exec(str);
    if (match) {
      return {
        type: 'method',
        constructor: match[1],
        cons: match[1],
        name: match[2],
        string: match[1] + '.prototype.' + match[2] + '()'
      };
    }
  });

  // push a matcher to recognize "async function" as a function
  dox.contextPatternMatchers.unshift(function(str) {
    const match = /^\s*(export(\s+default)?\s+)?(?:async\s+)?function\s+([\w$]+)\s*\(/.exec(str);
    if (match) {
      return {
        type: 'function',
        name: match[3],
        string: match[3] + '()'
      };
    }
  });
}

parseAllFiles();

/**
 * @typedef {Object} TagObject
 * @property {String} name The Processed name of the Tag (already includes all processing)
 * @property {String} description The Description of this Tag
 * @property {Boolean} optional Defines wheter the Tag is optional or not (already included in `name`)
 * @property {Boolean} nullable Defines wheter the Tag is nullable (dox does not add "null" by default)
 * @property {Boolean} nonNullable Unknown (invert of `nullable`?)
 * @property {Boolean} variable Defines wheter the type is spreadable ("...Type")
 * @property {String[]} types Collection of all types this Tag has
 * @property {String} type The Type of the Tag
 * @property {String} string The full string of types plus name plus description (unused in mongoose)
 * @property {String} typesDescription Processed `types` into markdown code (unused in mongoose)
 */

/**
 * @typedef {Object} SeeObject
 * @property {String} text The text to display the link as
 * @property {String} [url] The link the text should have as href
 */

/**
 * @typedef {Object} PropContext
 * @property {boolean} [isStatic] Defines wheter the current property is a static property (not mutually exlusive with "isInstance")
 * @property {boolean} [isInstance] Defines wheter the current property is a instance property (not mutually exlusive with "isStatic")
 * @property {boolean} [isFunction] Defines wheter the current property is meant to be a function
 * @property {string} [constructor] Defines the Constructor (or rather path) the current property is on
 * @property {boolean} [constructorWasUndefined] Defined wheter the "constructor" property was defined by "dox", but was set to "undefined"
 * @property {string} [type] Defines the type the property is meant to be
 * @property {string} [name] Defines the current Properties name
 * @property {TagObject} [return] The full object for a "@return" jsdoc tag
 * @property {string} [string] Defines the full string the property will be listed as
 * @property {string} [anchorId] Defines the Anchor ID to be used for linking
 * @property {string} [description] Defines the Description the property will be listed with
 * @property {string} [deprecated] Defines wheter the current Property is signaled as deprecated
 * @property {SeeObject[]} [see] Defines all "@see" references
 * @property {TagObject[]} [param] Defines all "@param" references
 * @property {SeeObject} [inherits] Defines the string for "@inherits"
 */

/**
 * @typedef {Object} NameObj
 * @property {string} docName
 * @property {string} filePath
 * @property {string} fullName
 * @property {string} docFileName
 */

/**
 * @typedef {Object} DocsObj
 * @property {string} title The Title of the page
 * @property {string} fileName The name of the resulting file
 * @property {PropContext[]} props All the functions and values
 * @property {string} file The original file (relative to the root of the repository)
 * @property {string} editLink The link used for edits
 * @property {boolean} [hideFromNav] Indicate that the entry should not be listed in the navigation
 */

/**
 * Process a file name to a documentation name
 * @param {string} input
 * @returns {NameObj}
 */
function processName(input) {
  let name = input.
    replace('lib/', '').
    replace('.js', '').
    replace('/index', '').
    replace('/methods', '');
  const lastSlash = name.lastIndexOf('/');
  const fullName = name;
  const basename = name.substr(lastSlash === -1 ? 0 : lastSlash + 1);
  name = basename;
  if (basename === 'core_array') {
    name = 'array';
  }
  if (fullName.startsWith('schema/')) {
    name = 'Schema';
    if (basename.charAt(0) !== basename.charAt(0).toUpperCase()) {
      name += basename.charAt(0).toUpperCase() + basename.substring(1);
    } else {
      name += basename;
    }
  }
  if (fullName === 'types/array/methods/index') {
    name = 'Array';
  }
  if (basename === 'SubdocumentPath') {
    name = 'SubdocumentPath';
  }
  if (basename === 'documentarray') {
    name = 'DocumentArrayPath';
  }
  if (basename === 'DocumentArray') {
    name = 'MongooseDocumentArray';
  }
  if (basename === 'index') {
    name = 'Mongoose';
  }

  const docName = name.charAt(0).toUpperCase() === name.charAt(0) ? name : name.charAt(0).toUpperCase() + name.substr(1);

  return {
    docName: docName,
    fullName: fullName,
    filePath: input,
    docFileName: name.toLowerCase()
  };
}

// helper function to keep translating array types to string consistent
function convertTypesToString(types) {
  return Array.isArray(types) ? types.join('|') : types;
}

/**
 * Parse all files defined in "files"
 */
function parseAllFiles() {
  for (const file of files) {
    parseFile(file, true);
  }
}

/**
 * Parse a specific file
 * @param {String} file The file to parse
 * @param {Boolean} throwErr throw the error if one is encountered?
 */
function parseFile(file, throwErr = true) {
  try {
    const comments = dox.parseComments(fs.readFileSync(file, 'utf8'), { raw: true });
    comments.file = file;
    processFile(comments);
  } catch (err) {
  // show log of which file has thrown a error for easier debugging
    console.error('Error while trying to parseComments for ', file);
    if (throwErr) {
      throw err;
    }
  }
}

function processFile(props) {
  const { docName: name, docFileName } = processName(props.file);
  /** @type {DocsObj} */
  const data = {
    title: name,
    fileName: docFileName,
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
    if ('receiver' in ctx) {
      ctx.constructor = ctx.receiver;
      delete ctx.receiver;
    }

    // in some cases "dox" has "ctx.constructor" defined but set to "undefined", which will later be used for setting "ctx.string"
    if ('constructor' in ctx && ctx.constructor === undefined) {
      ctx.constructorWasUndefined = true;
    }

    for (const __tag of prop.tags) {
      // the following has been done, because otherwise no type could be applied for intellisense
      /** @type {TagObject} */
      const tag = __tag;
      switch (tag.type) {
        case 'see':
          if (!Array.isArray(ctx.see)) {
            ctx.see = [];
          }

          // for this type, it needs to be parsed from the string itself to support more than 1 word
          // this is required because "@see" is kinda badly defined and mongoose uses a slightly customized way (longer text and different kinds of links)

          ctx.see.push(extractTextUrlFromTag(tag, ctx, true));
          break;
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
            tag.types.push('void');
          }

          ctx.return = tag;
          break;
        case 'inherits': {
          const obj = extractTextUrlFromTag(tag, ctx);
          // try to get the documentation name for the "@inherits" value
          // example: "@inherits SchemaType" -> "schematype.html"
          if (!obj.url || obj.url === obj.text) {
            let match = undefined;
            for (const file of files) {
              const { docName, docFileName } = processName(file);
              if (docName.toLowerCase().includes(obj.text.toLowerCase())) {
                match = docFileName;
                break;
              }
            }

            if (match) {
              obj.url = match + '.html';
            } else {
              console.warn(`no match found in files for inherits "${obj.text}" on "${ctx.constructor}.${ctx.name}"`);
            }
          }
          ctx.inherits = obj;
          break;
        }
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
          if (tag.variable) {
            if (tag.name.startsWith('[')) {
              tag.name = '[...' + tag.name.slice(1);
            } else {
              tag.name = '...' + tag.name;
            }
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
      // to transform things like "[Symbol.toStringTag]" to ".prototype[Symbol.toStringTag]" instead of ".prototype.[Symbol.toStringTag]"
      if (ctx.name.startsWith('[')) {
        ctx.string = `${ctx.constructor}.prototype${ctx.name}`;

      } else {
        ctx.string = `${ctx.constructor}.prototype.${ctx.name}`;
      }
    } else if (ctx.isStatic) {
      ctx.string = `${ctx.constructor}.${ctx.name}`;
    }

    // add "()" to the end of the string if function
    if ((ctx.isFunction || ctx.type === 'method') && !ctx.string.endsWith('()')) {
      ctx.string = ctx.string + '()';
    }

    ctx.anchorId = ctx.string;

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

  out.set(data.file, data);
}

/**
 * Extract the Text and Url from a description if any
 * @param {Tag} tag The tag to process the resulting object from
 * @param {PropContext} ctx The current ctx for warnings
 * @param {Boolean} warnOnMissingUrl Warn if the url is missing, false by default
 * @returns {{ text: string, url: string }}
 */
function extractTextUrlFromTag(tag, ctx, warnOnMissingUrl = false) {
  // the following regex matches cases of:
  // "External Links http://someurl.com/" -> "External Links"
  // "External https://someurl.com/" -> "External"
  // "Id href #some_Some-method" -> "Id href"
  // "Local Absolute /docs/somewhere" -> "Local Absolute"
  // "No Href" -> "No Href"
  // "https://someurl.com" -> "" (fallback added)
  // "Some#Method #something" -> "Some#Method"
  // "Test ./somewhere" -> "Test"
  // "Test2 ./somewhere#andsomewhere" -> "Test2"
  // The remainder is simply taken by a call to "slice" (also the text is trimmed later)
  const textMatches = /^(.*? (?=#|\/|(?:https?:)|\.\/|$))/i.exec(tag.string);

  let text = undefined;
  let url = undefined;
  if (textMatches === null || textMatches === undefined) {
    if (warnOnMissingUrl) {
      // warn for the cases where URL should be defined (like in "@see")
      console.warn(`No Text Matches found in tag for "${ctx.constructor}.${ctx.name}"`);
    }

    // if no text is found, add text as url and use the url itself as the text
    url = tag.string;
    text = tag.string;
  } else {
    text = textMatches[1].trim();
    url = tag.string.slice(text.length).trim();
  }

  return {
    text: text || 'No Description', // fallback text, so that the final text does not end up as a empty element that cannot be seen
    url: url || undefined // change to be "undefined" if text is empty or non-valid
  };
}

module.exports.parseFile = parseFile;
module.exports.parseAllFiles = parseAllFiles;
