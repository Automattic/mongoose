'use strict';

const handler = require('serve-handler');

require('http').createServer(function(req, res) {
  handler(req, res, { public: '.' }).catch(err => res.statusCode(500).send(err.message));
}).listen(8088);

console.log('now listening on http://localhost:8088');
