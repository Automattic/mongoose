'use strict';

const express = require('express');
const app = express();

const website = require('./website');

const port = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : 8089;

async function main() {
  await Promise.all([
    website.copyAllRequiredFiles(),
    website.pugifyAllFiles()
  ]);
  // start watching for file changes and re-compile them, so that they can be served directly
  website.startWatch();

  app.use('/', express.static(website.cwd));

  app.listen(port, () => {
    let urlPath = '/';

    if (website.versionObj.versionedDeploy) {
      urlPath = website.versionObj.versionedPath;
    }

    console.log(`now listening on http://127.0.0.1:${port}${urlPath}`);
  });
}

main();
