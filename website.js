'use strict';

const acquit = require('acquit');
const fs = require('fs');
const jade = require('jade');
const pkg = require('./package');
const linktype = require('./docs/helpers/linktype');
const href = require('./docs/helpers/href');
const klass = require('./docs/helpers/klass');
const transform = require('acquit-require');

require('acquit-ignore')();

const markdown = require('marked');
const highlight = require('highlight.js');
markdown.setOptions({
  highlight: function(code) {
    return highlight.highlight('JavaScript', code).value;
  }
});

jade.filters.markdown = markdown;

const tests = [
  ...acquit.parse(fs.readFileSync('./test/webpack.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/geojson.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/transactions.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/schema.alias.test.js').toString())
];

function getVersion() {
  return require('./package.json').version;
}

function getLatestLegacyVersion(startsWith) {
  var hist = fs.readFileSync('./History.md', 'utf8').replace(/\r/g, '\n').split('\n');
  for (var i = 0; i < hist.length; ++i) {
    var line = (hist[i] || '').trim();
    if (!line) {
      continue;
    }
    var match = /^\s*([^\s]+)\s/.exec(line);
    if (match && match[1] && match[1].startsWith(startsWith)) {
      return match[1];
    }
  }
  throw new Error('no match found');
}

// use last release
pkg.version = getVersion();
pkg.latest4x = getLatestLegacyVersion('4.');
pkg.latest38x = getLatestLegacyVersion('3.8');

var filemap = require('./docs/source');
var files = Object.keys(filemap);

function jadeify(filename, options, newfile) {
  options = options || {};
  options.package = pkg;
  options.linktype = linktype;
  options.href = href;
  options.klass = klass;

  let contents = fs.readFileSync(filename).toString();

  if (options.acquit) {
    contents = transform(contents, tests);
  }

  options.filename = filename;

  jade.render(contents, options, function(err, str) {
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

const _acquit = require('./docs/source/acquit');
const acquitFiles = Object.keys(_acquit);
acquitFiles.forEach(function(file) {
  var filename = __dirname + '/docs/acquit.jade';
  jadeify(filename, _acquit[file], __dirname + '/docs/' + file);
});
