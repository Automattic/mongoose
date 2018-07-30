'use strict';

/*!
 * Module dependencies
 */

const _ = require('lodash');
const dox = require('dox');
const fs = require('fs');
const link = require('../helpers/linktype');
const hl = require('highlight.js');
const md = require('markdown');

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
  'lib/error/index.js'
];

module.exports = {
  docs: [],
  github: 'https://github.com/Automattic/mongoose/blob/',
  title: 'API docs'
};

const out = module.exports.docs;

let combinedFiles = [];
for (const file of files) {
  const comments = dox.parseComments(fs.readFileSync(`./${file}`, 'utf8'));
  comments.file = file;
  combinedFiles.push(comments);
}

parse();

function parse() {
  for (const props of combinedFiles) {
    const data = {
      name: _.capitalize(props.file.replace('lib/', '').replace('.js', '').replace('/index', '')),
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
            ctx.name = tag.string;
            ctx.string = `${ctx.constructor}.prototype.${ctx.name}`;
            break;
          case 'static':
            ctx.type = 'property';
            ctx.static = true;
            ctx.name = tag.string;
            ctx.string = `${ctx.constructor}.${ctx.name}`;
            break;
          case 'return':
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
        }
      }

      console.log(ctx);

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
        replace(/&gt;/i, '>');
      ctx.description = highlight(ctx.description);

      data.props.push(ctx);
    }

    data.props.sort(function(a, b) {
      if (a.string < b.string) {
        return -1;
      } else {
        return 1;
      }
    });

    out.push(data);
  }
}

function highlight(str) {
  return str.replace(/(<pre><code>)([^<]+)(<\/code)/gm, function (_, $1, $2, $3) {
    const code = /^(?:`{3}([^\n]+)\n)?([\s\S]*)/gm.exec($2);

    if ('js' === code[1] || !code[1]) {
      code[1] = 'javascript';
    }

    return $1 + hl.highlight(code[1], code[2]).value.trim() + $3;
  });
}
