'use strict';

const api = require('./api');
const fs = require('fs');
const pug = require('pug');
const pkg = require('../../package.json');

let jobs = [];
try {
  jobs = require('../../docs/data/jobs.json');
} catch (err) {}

api.docs.forEach(file => {
  const options = Object.assign({}, file, {
    package: pkg,
    docs: api.docs,
    outputUrl: `/docs/api/${file.fileName}.html`,
    jobs,
    title: file.name
  });

  const html = pug.renderFile('./docs/api_split.pug', options);
  console.log('Write', file.name);
  fs.writeFileSync(`./docs/api/${file.fileName}.html`, html);
});
