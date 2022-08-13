'use strict';

const express = require('express');
const app = express();

const website = require('./website');

const port = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : 8089;

async function main() {
  await website.pugifyAllFiles();
  // start watching for file changes and re-compile them, so that they can be served directly
  website.startWatch();

  app.use('/', express.static(website.cwd));

  app.listen(port, () => {
    console.log(`now listening on http://localhost:${port}`);
  });
}

main();
