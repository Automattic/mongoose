/*!
 * Module dependencies
 */

var fs = require('fs');
var hl = require('highlight.js')

module.exports = { docs: [], github: 'https://github.com/LearnBoost/mongoose/tree/' }
var out = module.exports.docs;

var docs = fs.readFileSync(__dirname + '/_docs', 'utf8');
parse(docs);

function parse (docs) {
  docs.split(/^### /gm).forEach(function (chunk) {
    if (!(chunk = chunk.trim())) return;

    chunk = chunk.split(/^([^\n]+)\n/);

    var title = chunk[1];

    if (!title || !(title = title.trim()))
      throw new Error('missing title');

    var json = JSON.parse(chunk[2]);

    var props = [];
    var methods = [];
    var constructor = null;

    json.forEach(function (comment) {
      if (comment.description)
        highlight(comment.description);

      var prop = false;
      comment.params = [];
      comment.see = [];

      var i = comment.tags.length;
      while (i--) {
        var tag = comment.tags[i];
        switch (tag.type) {
        case 'property':
          prop = true;
          comment.ctx || (comment.ctx = {});
          comment.ctx.name = tag.string;
          props.unshift(comment);
          break;
        case 'method':
          prop = false;
          comment.ctx || (comment.ctx = {});
          comment.ctx.name || (comment.ctx.name = tag.string);
          comment.ctx.type = 'method';
          comment.code = '';
          break;
        case 'memberOf':
          prop = false;
          comment.ctx || (comment.ctx = {});
          comment.ctx.constructor = tag.parent;
          break;
        case 'inherits':
          if (/http/.test(tag.string)) {
            var result = tag.string.split(' ');
            var href = result.pop();
            var title = result.join(' ');
            comment.inherits = '<a href="'
                     + href
                     + '" title="' + title + '">' + title + '</a>';
          } else {
            comment.inherits = tag.string;
          }
          comment.tags.splice(i, 1);
          break;
        case 'param':
          comment.params.unshift(tag);
          comment.tags.splice(i, 1);
          break;
        case 'return':
          comment.return = tag;
          comment.tags.splice(i, 1);
          break;
        case 'see':
          comment.see.unshift(tag);
          comment.tags.splice(i, 1);
          break;
        }
      }

      if (!prop) {
        //if ('function' == comment.ctx.type)
          //constructor = comment;
        //else
          methods.push(comment);
      }
    });

    // add constructor to properties too
    methods.some(function (method) {
      if (method.ctx && 'method' == method.ctx.type && method.ctx.hasOwnProperty('constructor')) {
        props.forEach(function (prop) {
          prop.ctx.constructor = method.ctx.constructor;
        });
        return true;
      }
      return false;
    });

    out.push({
        title: title
      , methods: methods
      , props: props
    });
  });
}

// add "class='language'" to our <pre><code> elements
function highlight (o) {
  o.full = fix(o.full);
  o.summary = fix(o.summary);
  o.body = fix(o.body);
}

function fix (str) {
  return str.replace(/(<pre><code>)([^<]+)(<\/code)/gm, function (_, $1, $2, $3) {

    // parse out the ```language
    var code = /^(?:`{3}([^\n]+)\n)?([\s\S]*)/gm.exec($2);

    if ('js' == code[1] || !code[1]) {
      code[1] = 'javascript';
    }

    return $1
          + hl.highlight(code[1], code[2]).value.trim()
          + $3;
  });
}
