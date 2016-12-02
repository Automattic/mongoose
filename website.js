var fs = require('fs');
var jade = require('jade');
var package = require('./package');
var hl = require('./docs/helpers/highlight');
var linktype = require('./docs/helpers/linktype');
var href = require('./docs/helpers/href');
var klass = require('./docs/helpers/klass');

// add custom jade filters
require('./docs/helpers/filters')(jade);

function getVersion() {
  var hist = fs.readFileSync('./History.md', 'utf8').replace(/\r/g, '\n').split('\n');
  for (var i = 0; i < hist.length; ++i) {
    var line = (hist[i] || '').trim();
    if (!line) {
      continue;
    }
    var match = /^\s*([^\s]+)\s/.exec(line);
    if (match && match[1]) {
      return match[1];
    }
  }
  throw new Error('no match found');
}

function getUnstable(ver) {
  ver = ver.replace('-pre');
  var spl = ver.split('.');
  spl = spl.map(function(i) {
    return parseInt(i, 10);
  });
  spl[1]++;
  spl[2] = 'x';
  return spl.join('.');
}

// use last release
package.version = getVersion();
package.unstable = getUnstable(package.version);

var filemap = require('./docs/source');
var files = Object.keys(filemap);

function jadeify(filename, options, newfile) {
  options = options || {};
  options.package = package;
  options.hl = hl;
  options.linktype = linktype;
  options.href = href;
  options.klass = klass;
  jade.renderFile(filename, options, function(err, str) {
    if (err) {
      console.error(err.stack);
      return;
    }

    newfile = newfile || filename.replace('.jade', '.html');
    fs.writeFile(newfile, str, function(err) {
      if (err) {
        console.error('could not write', err.stack);
      } else {
        console.log('%s : rendered ', new Date, newfile);
      }
    });
  });
}

files.forEach(function(file) {
  var filename = __dirname + '/' + file;
  jadeify(filename, filemap[file]);

  if (process.argv[2] === '--watch') {
    fs.watchFile(filename, {interval: 1000}, function(cur, prev) {
      if (cur.mtime > prev.mtime) {
        jadeify(filename, filemap[file]);
      }
    });
  }
});

var acquit = require('./docs/source/acquit');
var acquitFiles = Object.keys(acquit);
acquitFiles.forEach(function(file) {
  var filename = __dirname + '/docs/acquit.jade';
  jadeify(filename, acquit[file], __dirname + '/docs/' + file);
});
