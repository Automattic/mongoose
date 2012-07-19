/*!
 * Module dependencies
 */

var fs = require('fs');

module.exports = { docs: [] }
var out = module.exports.docs;

var docs = fs.readFileSync(__dirname + '/_docs', 'utf8');

parse(docs);

function parse (docs) {
  docs.split(/^### /gm).forEach(function (chunk) {
    if (!(chunk = chunk.trim())) return;

    chunk = chunk.split(/^([^\n]+)\n/);

    var title = chunk[1];

    if (!title || !(title = title.trim()))
      throw new Error('missing title');

    var json = JSON.parse(chunk[2]);

    out.push({ title: title, json: json });
  });
}

