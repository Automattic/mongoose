var fs = require('fs');
var acquit = require('acquit');
var marked = require('marked');

var docTests = acquit.parse(
  fs.readFileSync('test/harmony/document.test_.js').toString());
var queryTests = acquit.parse(
  fs.readFileSync('test/harmony/query.test_.js').toString());
blocks = docTests.concat(queryTests);

var trimEachLine = function(str) {
  var lines = str.split('\n');
  var result = '';
  for (var i = 0; i < lines.length; ++i) {
    var toAdd = lines[i].trim();
    if (toAdd.indexOf('*') === 0) {
      toAdd = toAdd.substr('*'.length).trim();
    }
    result += (i > 0 ? '\n' : '') + toAdd;
  }

  return result;
};

for (var i = 0; i < blocks.length; ++i) {
  var block = blocks[i];
  block.contents = marked(trimEachLine(block.contents));
  if (block.comments && block.comments.length) {
    console.log(block.comments[0]);
    block.comments[0] = marked(trimEachLine(block.comments[0]));
  }

  for (var j = 0; j < block.blocks.length; ++j) {
    var b = block.blocks[j];
    b.contents = marked(trimEachLine(b.contents));
    if (b.comments && b.comments.length) {
      b.comments[0] = marked(trimEachLine(b.comments[0]));
    }
  }
}

module.exports = {
  title: 'Using Mongoose with ECMAScript 6 (Harmony)',
  acquitBlocks: blocks
};
