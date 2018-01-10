'use strict';

/*!
 * Module dependencies
 */

const dox = require('dox');
const fs = require('fs');
const link = require('../helpers/linktype');
const hl = require('highlight.js');
const md = require('markdown');

const files = [
  'lib/connection.js'
];

module.exports = {
  docs: [],
  github: 'https://github.com/Automattic/mongoose/blob/',
  title: 'API docs'
};

const out = module.exports.docs;

let combinedFiles = [];
for (const file of files) {
  combinedFiles.push(dox.parseComments(fs.readFileSync(`./${file}`, 'utf8')));
}

parse();

function parse() {
  for (const props of combinedFiles) {
    const data = {
      name: 'Connection',
      props: []
    };

    for (const prop of props) {
      if (prop.ignore || prop.isPrivate) {
        continue;
      }

      const ctx = prop.ctx || {};
      for (const tag of prop.tags) {
        switch (tag.type) {
          case 'property':
            ctx.type = 'property';
            ctx.name = tag.string;
            ctx.string = `${ctx.constructor}.prototype.${ctx.name}`;
            break;
          case 'inherits':
            ctx[tag.type] = tag.string;
            break;
          case 'event':
            ctx[tag.type] = (ctx[tag] || []);
            ctx[tag.type].push(tag.string);
            break;
          case 'method':
            ctx.type = 'method';
            ctx.string = `${ctx.constructor}.prototype.${ctx.name}()`;
            break;
          case 'memberOf':
            ctx.constructor = tag.parent;
            ctx.string = `${ctx.constructor}.prototype.${ctx.name}`;
            break;
        }
      }

      console.log(ctx);

      // Backwards compat
      if (typeof ctx.constructor === 'string') {
        ctx.anchorId = `${ctx.constructor.toLowerCase()}_${ctx.constructor}-${ctx.name}`;
      } else {
        ctx.anchorId = `${ctx.name.toLowerCase()}_${ctx.name}`;
      }

      data.props.push(ctx);
    }

    out.push(data);
  }
}
