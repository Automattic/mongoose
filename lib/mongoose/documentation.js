
/**
 * Module dependencies.
 */

var md = require('../../support/node-markdown/lib/markdown').Markdown
  , sys = require('sys')
  , fs = require('fs');

/**
 * Initialize a `Documentation` generator with the given `options`.
 */

var Documentation = exports = module.exports = function Documentation(options) {
  this.models = options.models;
  this.dest = options.dest || process.cwd();
  this.docs = [];
};

/**
 * Generate markdown docs for the given `model` / `name`.
 *
 * @param {Schema} model
 * @param {String} name
 * @return {String}
 * @api private
 */

Documentation.prototype.generateMarkdownFor = function(model, name){
  var buf = [];
  buf.push('# ' + name);
  buf.push(this.schema(model, name));
  // buf.push(this.types(model, name));
  // buf.push(this.statics(model, name));
  // buf.push(this.hooks(model, name));
  // buf.push(this.methods(model, name));
  return buf.join('\n');
};

/**
 * Generate schema markdown.
 *
 * @param {Schema} model
 * @param {String} name
 * @return {String}
 * @api private
 */

Documentation.prototype.schema = function(model, name){
  var buf = '';
  walk(model, function(path, prop){
    console.log(' %s : %s', path, prop.type);
  });
  return buf;
};

/**
 * Generate documentation.
 *
 * @api public
 */

Documentation.prototype.generate = function(){
  var names = Object.keys(this.models);
  for (var i = 0, len = names.length; i < len; ++i) {
    var name = names[i]
      , model = this.models[name];
    this.docs.push(this.generateMarkdownFor(model, name));
  }
};

function walk(schema, struct, fn, path) {
  var path = path || []
    , prop
    , curpath;

  if ('function' == typeof struct) {
    fn = struct;
    struct = schema._struct;
  }

  for (var i = 0, len = struct.length; i < len; ++i) {
    prop = struct[i];
    if ('string' == typeof prop) {
      curpath = path.concat(prop).join('.');
      if (schema.paths[curpath].options && schema.paths[curpath].options._struct) {
        walk(schema, schema.paths[curpath].options._struct, fn, path);
      } else {
        fn(curpath, schema.paths[curpath]);
      }
    } else {
      prop = prop[0];
      curpath = path.concat(prop).join('.');
      walk(schema, struct[i][1], fn, path.concat(prop));
    }
  }
}