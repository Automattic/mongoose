const fs = require('fs');
const jade = require('jade');
const package = require('./package');
const linktype = require('./docs/helpers/linktype');
const href = require('./docs/helpers/href');
const klass = require('./docs/helpers/klass');

// clean up version for ui
package.version = package.version.replace(/-pre$/, '');

const filemap = require('./docs/source');
const files = Object.keys(filemap);

files.forEach(function (file) {
  var filename = __dirname + '/' + file;
  jadeify(filename, filemap[file]);

  if ('--watch' == process.argv[2]) {
    fs.watchFile(filename, { interval: 1000 }, function (cur, prev) {
      if (cur.mtime > prev.mtime) {
        jadeify(filename, filemap[file]);
      }
    });
  }
});

function jadeify (filename, options) {
  options || (options = {});
  options.package = package;
  options.linktype = linktype;
  options.href = href;
  options.klass = klass;
  jade.renderFile(filename, options, function (err, str) {
    if (err) return console.error(err.stack);

    var newfile = filename.replace('.jade', '.html')
    fs.writeFile(newfile, str, function (err) {
      if (err) return console.error('could not write', err.stack);
      console.log('%s : rendered ', new Date, newfile);
    });
  });
}
