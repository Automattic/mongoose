
/**
 * Module dependencies.
 */

var md = require('../../support/node-markdown/lib/markdown').Markdown
  , sys = require('sys')
  , fs = require('fs')
  , write = fs.writeFileSync;

/**
 * Initialize a `Documentation` generator with the given `options`.
 */

var Documentation = exports = module.exports = function Documentation(options) {
  this.models = options.models;
  this.dest = options.dest || process.cwd();
  this.filename = 'index';
  this.markdown = true;
  this.html = true;
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
  var buf = [''];
  walk(model, function(path, prop){
    var depth = path.split('.').length
      , indent = '  ';

    // Property name
    buf.push(indent + '- ' + path);

    // Property type
    buf.push(indent + '  - **Type**: ' + prop.type);

    // Default value
    if (undefined !== prop._default) {
      var val = 'function' == typeof prop._default
        ? prop._default.toString()
        : prop._default;
      buf.push(indent + '  - **Default**: ' + val);
    }

    // Flags
    if (prop._required) buf.push(indent + '  - **Required**');
    if (prop._strict) buf.push(indent + '  - **Strict**');
  });
  return buf.join('\n');
};

/**
 * Generate documentation.
 *
 * @api public
 */

Documentation.prototype.generate = function(){
  var buf = []
    , names = Object.keys(this.models);
  for (var i = 0, len = names.length; i < len; ++i) {
    var name = names[i]
      , model = this.models[name];
    buf.push(this.generateMarkdownFor(model, name));
  }
  this.write(buf.join('\n'));
};

/**
 * Write the given markdown `str` to disk.
 *
 * @param {String} str
 * @api private
 */

Documentation.prototype.write = function(str){
  var markdownPath = this.dest + '/' + this.filename + '.md'
    , htmlPath = this.dest + '/' + this.filename + '.html'; 
  if (this.markdown) write(markdownPath, str, 'utf8');
  if (this.html) write(htmlPath, md(str), 'utf8');
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