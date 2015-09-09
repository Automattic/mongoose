var fs = require('fs');
var acquit = require('acquit');
var marked = require('marked');

require('acquit-ignore')();

var files = [
  {
    input: 'test/docs/discriminators.test.js',
    output: 'discriminators.html',
    title: 'Discriminators'
  }
];

files.forEach(function(file) {
  var blocks = acquit.parse(fs.readFileSync(file.input).toString());

  for (var i = 0; i < blocks.length; ++i) {
    var block = blocks[i];
    block.identifier = toHtmlIdentifier(acquit.trimEachLine(block.contents));
    block.contents = marked(acquit.trimEachLine(block.contents));
    if (block.comments && block.comments.length) {
      var last = block.comments.length - 1;
      block.comments[last] =
        marked(acquit.trimEachLine(block.comments[last]));
    }

    for (var j = 0; j < block.blocks.length; ++j) {
      var b = block.blocks[j];
      b.identifier = toHtmlIdentifier(acquit.trimEachLine(b.contents));
      b.contents = marked(acquit.trimEachLine(b.contents));
      if (b.comments && b.comments.length) {
        var last = b.comments.length - 1;
        b.comments[last] = marked(acquit.trimEachLine(b.comments[last]));
      }
    }
  }

  exports[file.output] = {
    title: file.title,
    acquitBlocks: blocks,
    destination: file.output,
    guide: true
  }
});

function toHtmlIdentifier(str) {
  return str.toLowerCase().replace(/ /g, '-').replace(/\(/g, '').
    replace(/\)/, '').replace(/`/g, '').replace(/\./g, '-').replace(/'/g, '');
}
