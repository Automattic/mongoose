
var fs= require('fs')
var jade = require('jade')
var package = require('./package.json')
var hl = require('highlight.js')

// add highlighting filter to jade
jade.filters.js = function (str) {
  var ret = hl.highlight('javascript', str.replace(/\\n/g, '\n')).value;
  var code = '<pre><code class="javascript">' + ret.replace(/\n/g, '\\n') + '</code></pre>';
  return code;
}
jade.filters.bash = function (str) {
  var ret = hl.highlight('bash', str.replace(/\\n/g, '\n')).value;
  var code = '<pre><code class="bash">' + ret + '</code></pre>';
  return  code
}

var filemap = {};

var images = fs.readFileSync(__dirname + '/docs/images/apps/urls', 'utf-8').split('\n');
var imgs = [];
images.forEach(function (line) {
  line = line.trim();
  if (!line) return;
  line = line.split('|');
  imgs.push({ url: line[0], title: line[1], desc: line[2], src: line[1].toLowerCase().replace(/\s/g,'') });
});

filemap['index.jade'] = {
    package: package
  , images: imgs
}

var files = Object.keys(filemap);

files.forEach(function (file) {
  var filename = __dirname + '/' + file;
  jadeify(filename, filemap[file]);
  fs.watchFile(filename, { interval: 1000 }, function (cur, prev) {
    if (cur.mtime > prev.mtime) {
      jadeify(filename, filemap[file]);
    }
  });
});

function jadeify (filename, options) {
  options || (options = {});
  jade.renderFile(filename, options, function (err, str) {
    if (err) return console.error(err.stack);

    var newfile = filename.replace('.jade', '.html')
    fs.writeFile(newfile, str, function (err) {
      if (err) return console.error('could not write', err.stack);
      console.error('%s : rendered ', new Date, newfile);
    });
  });
}
