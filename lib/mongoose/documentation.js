
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
  buf.push(this.types(model, name));
  buf.push(this.statics(model, name));
  buf.push(this.hooks(model, name));
  buf.push(this.methods(model, name));
  return buf.join('\n');
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
