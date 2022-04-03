'use strict';

/*!
 * Module dependencies
 */

const dox = require('dox');
const fs = require('fs');
const link = require('../helpers/linktype');
const hl = require('highlight.js');
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
  'lib/types/ArraySubdocument.js'
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
  const comments = dox.parseComments(fs.readFileSync(`./${file}`, 'utf8'), { raw: true });
  comments.file = file;
  combinedFiles.push(comments);
}

parse();

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

      const ctx = prop.ctx || {};
      for (const tag of prop.tags) {
        switch (tag.type) {
          case 'receiver':
            ctx.constructor = tag.string;
            break;
          case 'property':
            ctx.type = 'property';
            let str = tag.string;
            const match = str.match(/^{\w+}/);
            if (match != null) {
              ctx.type = match[0].substring(1, match[0].length - 1);
              str = str.replace(/^{\w+}\s*/, '');
            }
            ctx.name = str;
            ctx.string = `${ctx.constructor}.prototype.${ctx.name}`;
            break;
          case 'type':
            ctx.type = Array.isArray(tag.types) ? tag.types.join('|') : tag.types;
            break;
          case 'static':
            ctx.type = 'property';
            ctx.static = true;
            ctx.name = tag.string;
            ctx.string = `${data.name}.${ctx.name}`;
            break;
          case 'function':
            ctx.type = 'function';
            ctx.static = true;
            ctx.name = tag.string;
            ctx.string = `${data.name}.${ctx.name}()`;
            break;
          case 'return':
            tag.return = tag.description ?
              md.parse(tag.description).replace(/^<p>/, '').replace(/<\/p>$/, '') :
              '';
            ctx.return = tag;
            break;
          case 'inherits':
            ctx[tag.type] = tag.string;
            break;
          case 'event':
          case 'param':
            ctx[tag.type] = (ctx[tag.type] || []);
            if (tag.types) {
              tag.types = tag.types.join('|');
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
            ctx.string = `${ctx.constructor}.prototype.${ctx.name}()`;
            break;
          case 'memberOf':
            ctx.constructor = tag.parent;
            ctx.string = `${ctx.constructor}.prototype.${ctx.name}`;
            if (ctx.type === 'method') {
              ctx.string += '()';
            }
            break;
          case 'constructor':
            ctx.string = tag.string + '()';
            ctx.name = tag.string;
        }
      }

      if (/\.prototype[^.]/.test(ctx.string)) {
        ctx.string = `${ctx.constructor}.prototype.${ctx.name}`;
      }

      // Backwards compat
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
      if (ctx.description.includes('function capitalize')) {
        console.log('\n\n-------\n\n', ctx);
      }
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

function highlight(str) {
  return str.replace(/(<pre><code>)([^<]+)(<\/code)/gm, function(_, $1, $2, $3) {
    const code = /^(?:`{3}([^\n]+)\n)?([\s\S]*)/gm.exec($2);

    if ('js' === code[1] || !code[1]) {
      code[1] = 'javascript';
    }

    return $1 + hl.highlight(code[2], { language: code[1] }).value.trim() + $3;
  });
}
