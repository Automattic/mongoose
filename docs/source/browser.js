var fs = require('fs');
var acquit = require('acquit');
var marked = require('marked');

var blocks = acquit.parse(
  fs.readFileSync('test/browser/example.test_.js').toString());

for (var i = 0; i < blocks.length; ++i) {
  var block = blocks[i];
  block.contents = marked(acquit.trimEachLine(block.contents));
  if (block.comments && block.comments.length) {
    block.comments[0] = marked(acquit.trimEachLine(block.comments[0]));
  }

  for (var j = 0; j < block.blocks.length; ++j) {
    var b = block.blocks[j];
    b.contents = marked(acquit.trimEachLine(b.contents));
    if (b.comments && b.comments.length) {
      b.comments[0] = marked(acquit.trimEachLine(b.comments[0]));
    }

    for (var k = 0; k < b.blocks.length; ++k) {
      var it = b.blocks[k];
      it.contents = marked(acquit.trimEachLine(it.contents));
      if (it.comments && it.comments.length) {
        it.comments[0] = marked(acquit.trimEachLine(it.comments[0]));
      }
    }
  }
}

module.exports = {
  title: 'Using Mongoose Schema Validation in the Browser',
  acquitBlocks: blocks,
  guide: true
};
