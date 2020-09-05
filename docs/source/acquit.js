'use strict';
var fs = require('fs');
var acquit = require('acquit');
var hl = require('highlight.js');
var marked = require('marked');

require('acquit-ignore')();

var files = [
  {
    input: 'test/docs/defaults.test.js',
    output: 'defaults.html',
    title: 'Defaults'
  },
  {
    input: 'test/docs/discriminators.test.js',
    output: 'discriminators.html',
    title: 'Discriminators'
  },
  {
    input: 'test/es-next/promises.test.es6.js',
    output: 'promises.html',
    title: 'Promises',
    suffix: `
      <div>
        <br>
        <i>
          Want to learn how to check whether your favorite npm modules work with
          async/await without cobbling together contradictory answers from Google
          and Stack Overflow? Chapter 4 of Mastering Async/Await explains the
          basic principles for determining whether frameworks like React and
          Mongoose support async/await.
          <a href="http://asyncawait.net/?utm_source=mongoosejs&utm_campaign=promises">Get your copy!</a>
        </i>
        <br><br>
        <a href="http://asyncawait.net/?utm_source=mongoosejs&utm_campaign=promises" style="margin-left: 100px">
          <img src="/docs/images/asyncawait.png" style="width: 650px" />
        </a>
      </div>
    `
  },
  {
    input: 'test/docs/schematypes.test.js',
    output: 'customschematypes.html',
    title: 'Custom Schema Types'
  },
  {
    input: 'test/docs/validation.test.js',
    output: 'validation.html',
    title: 'Validation'
  },
  {
    input: 'test/docs/schemas.test.js',
    output: 'advanced_schemas.html',
    title: 'Advanced Schemas'
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
    if (block.code) {
      b.code = hl.highlight('javascript', b.code).value;
    }

    for (var j = 0; j < block.blocks.length; ++j) {
      var b = block.blocks[j];
      b.identifier = toHtmlIdentifier(acquit.trimEachLine(b.contents));
      b.contents = marked(acquit.trimEachLine(b.contents), []);
      if (b.comments && b.comments.length) {
        var last = b.comments.length - 1;
        b.comments[last] = marked(acquit.trimEachLine(b.comments[last]));
      }
    }
  }

  exports[file.output] = {
    input: file.input,
    title: file.title,
    acquitBlocks: blocks,
    suffix: file.suffix,
    destination: file.output,
    guide: true
  }
});

function toHtmlIdentifier(str) {
  return str.toLowerCase().replace(/ /g, '-').replace(/\(/g, '').
    replace(/\)/, '').replace(/`/g, '').replace(/\./g, '-').replace(/'/g, '');
}
