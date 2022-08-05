'use strict';

const handler = require('serve-handler');
const website = require('./website');

const port = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : 8089;

async function main() {
  await website.pugifyAllFiles();
  // start watching for file changes and re-compile them, so that they can be served directly
  website.startWatch();

  require('http').createServer(function(req, res) {
  // using "rewrites", because the current script file is in a different directly that what should be served
    handler(req, res, { rewrites: [{ source: '.', destination: '..' }] }).catch(err => res.statusCode(500).send(err.message));
  }).listen(port);

  console.log(`now listening on http://localhost:${port}`);

}

main();
