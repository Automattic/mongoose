var fs = require('fs');
var acquit = require('acquit');
var marked = require('marked');

var docTests = acquit.parse(
  fs.readFileSync('test/harmony/document.test_.js').toString());
var queryTests = acquit.parse(
  fs.readFileSync('test/harmony/query.test_.js').toString());
var modelTests = acquit.parse(
  fs.readFileSync('test/harmony/model.test_.js').toString());
blocks = docTests.concat(queryTests).concat(modelTests);

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
  }
}

module.exports = {
  title: 'Using Mongoose with ECMAScript 6 (Harmony)',
  acquitBlocks: blocks,
  guide: true
};
