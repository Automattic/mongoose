'use strict';

const api = require('./api');
const fs = require('fs');
const pug = require('pug');
const pkg = require('../../package.json');

let jobs = [];
try {
  jobs = require('../data/jobs.json');
} catch (err) {}

api.docs.forEach(file => {
  const options = Object.assign({}, file, {
    package: pkg,
    docs: api.docs,
    outputUrl: `/docs/api/${file.fileName}.html`,
    jobs,
    title: file.title
  });

  const html = pug.renderFile('./docs/api_split.pug', options);
  console.log('Write', file.title);
  // path is relative to CWD not __dirname
  fs.writeFileSync(`./docs/api/${file.fileName}.html`, html);
});
