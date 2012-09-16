/*!
 * Module dependencies
 */

var fs = require('fs');
var link = require('../helpers/linktype');
var hl = require('highlight.js')
var md = require('markdown')

module.exports = {
    docs: []
  , github: 'https://github.com/LearnBoost/mongoose/tree/'
  , title: 'API docs'
}

var out = module.exports.docs;

var docs = fs.readFileSync(__dirname + '/_docs', 'utf8');
parse(docs);
order(out);

function parse (docs) {
  docs.split(/^### /gm).forEach(function (chunk) {
    if (!(chunk = chunk.trim())) return;

    chunk = chunk.split(/^([^\n]+)\n/);

    var title = chunk[1];

    if (!title || !(title = title.trim()))
      throw new Error('missing title');

    title = title.replace(/^lib\//, '');

    var json = JSON.parse(chunk[2]);

    var props = [];
    var methods = [];
    var statics = [];
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
        case 'static':
          prop = false;
          comment.ctx || (comment.ctx = {});
          comment.ctx.name = tag.string;
          comment.ctx.type = 'method';
          break;
        case 'receiver':
          prop = false;
          comment.ctx || (comment.ctx = {});
          comment.ctx.receiver = tag.string;
          break;
        case 'constructor':
          prop = false;
          comment.ctx || (comment.ctx = {});
          comment.ctx.name || (comment.ctx.name = tag.string);
          comment.ctx.type = 'function';
          comment.code = '';
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
            comment.inherits = link(tag.string);
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
          if (tag.local) {
            var parts = tag.local.split(' ');
            if (1 === parts.length) {
              tag.url = link.type(parts[0]);
              tag.title = parts[0];
            } else {
              tag.url = parts.pop();
              tag.title = parts.join(' ');
            }
          }
          comment.see.unshift(tag);
          comment.tags.splice(i, 1);
          break;
        case 'event':
          var str = tag.string.replace(/\\n/g, '\n');
          tag.string = md.parse(str).replace(/\n/g, '\\n').replace(/'/g, '&#39;');
          comment.events || (comment.events = []);
          comment.events.unshift(tag);
          comment.tags.splice(i, 1);
        }
      }

      if (!prop) {
        methods.push(comment);
      }
    });

    methods = methods.filter(ignored);
    props = props.filter(ignored);

    function ignored (method) {
      if (method.ignore) return false;
      return true;
    }

    if (0 === methods.length + props.length) return;

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

    var len = methods.length;
    while (len--) {
      method = methods[len];
      if (method.ctx && method.ctx.receiver) {
        var stat = methods.splice(len, 1)[0];
        statics.unshift(stat);
      }
    }

    out.push({
        title: title
      , methods: methods
      , props: props
      , statics: statics
      , hasPublic: hasPublic(methods, props, statics)
    });
  });
}

function hasPublic () {
  for (var i = 0; i < arguments.length; ++i) {
    var arr = arguments[i];
    for (var j = 0; j < arr.length; ++j) {
      var item = arr[j];
      if (!item.ignore && !item.isPrivate) return true;
    }
  }
  return false;
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

function order (docs) {
  // want index first
  for (var i = 0; i < docs.length; ++i) {
    if ('index.js' == docs[i].title) {
      docs.unshift(docs.splice(i, 1)[0]);
    }
  }
}
