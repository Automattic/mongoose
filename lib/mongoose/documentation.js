
/**
 * Module dependencies.
 */

var md = require('../../support/node-markdown/lib/markdown').Markdown
  , sys = require('sys')
  , fs = require('fs')
  , write = fs.writeFileSync
  , read = fs.readFileSync
  , util = require('./util');

/**
 * Initialize a `Documentation` generator with the given `options`.
 */

var Documentation = exports = module.exports = function Documentation(options) {
  this.title = options.title || 'Documentation';
  this.models = options.models;
  this.dest = options.dest || process.cwd();
  this.filename = 'index';
  this.markdown = undefined === options.markdown ? true : options.markdown;
  this.html = undefined === options.html ? true : options.html;
  this.decorate = undefined === options.decorate ? true : options.decorate;
  this.head = read(__dirname + '/documentation/head.html', 'utf8');
  this.css = read(__dirname + '/documentation/style.css', 'utf8');
  this.foot = read(__dirname + '/documentation/foot.html', 'utf8');
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
  var buf = [''];
  buf.push('## ' + name);
  buf.push(this.schema(model, name));
  buf.push(this.statics(model, name));
  return buf.join('\n');
};

/**
 * Generate static method markdown
 *
 * @param {Schema} model
 * @param {String} name
 * @return {String}
 * @api private
 */

Documentation.prototype.statics = function(model, name){
  var buf = ['']
    , methods = Object.keys(model._statics)
      .concat(Object.keys(model._staticGetters))
      .concat(Object.keys(model._staticSetters))
    , staticGetters = Object.keys(model._staticGetters)
    , staticSetters = Object.keys(model._staticSetters);

  buf.push('### Static Methods');

  methods.forEach(function(name){
    if (name in model._statics) {
      var fn = model._statics[name].toString()
        , sig = fn.split('\n')[0].replace(/function |[(){]/g, '');
      buf.push('  - ' + name + ' <span class="signature">' + sig + '</span>');
    } else if (name in model._staticGetters) {
      buf.push('  - ' + name);
    } else if (name in model._staticSetters) {
      buf.push('  - ' + name + '=');
    }
  });

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
  util.walk(model, function(path, prop){
    var depth = path.split('.').length
      , indent = '  ';

    // Property name / type
    buf.push(indent + '- ' + path + ' <span class="type">' + prop.type + '</span>');

    // Default value
    if (undefined !== prop._default) {
      // ignore functions for now... need a better way to display them
      if ('function' != typeof prop._default) {
        buf.push(indent + '  - **Default**: ' + prop._default);
      }
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
 * Return the head markup with local substitution.
 *
 * @param {Object} locals
 * @return {String}
 * @api private
 */

Documentation.prototype.headMarkup = function(locals){
  return this.head.replace(/\{([^}]+)\}/g, function(_, key){
    return locals[key];
  });
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

  // Generate markdown
  if (this.markdown) {
    write(markdownPath, str, 'utf8');
  }

  // Generate html
  if (this.html) {
    var html = md(str);
    // Decorate with head/foot/css
    if (this.decorate) {
      html = this.headMarkup({
          title: this.title
        , css: this.css
      }) + html + this.foot;
    }
    write(htmlPath, html, 'utf8');
  }
};
