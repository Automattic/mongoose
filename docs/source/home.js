
var fs = require('fs')
var package = require('./../../package.json')
var images = fs.readFileSync(__dirname + '/../images/apps/urls', 'utf-8').split('\n');

var imgs = [];

images.forEach(function (line) {
  line = line.trim();
  if (!line) return;
  line = line.split('|');
  imgs.push({ url: line[0], title: line[1], desc: line[2], src: line[1].toLowerCase().replace(/\s/g,'') });
});

module.exports = {
    package: package
  , images: imgs
  , title: 'ODM'
}
