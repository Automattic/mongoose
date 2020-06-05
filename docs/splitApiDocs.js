'use strict';

const api = require('./source/api');
const fs = require('fs');
const jade = require('pug');
const pkg = require('../package.json');

api.docs.forEach(file => {
  if (file.name === 'Index') {
    file.name = 'Mongoose';
  }

  const options = Object.assign({}, file, {
    package: pkg,
    docs: api.docs,
    outputUrl: `/docs/api/${file.name.toLowerCase()}.html`
  });

  const html = jade.renderFile('./docs/api_split.pug', options);
  console.log('Write', file.name);
  fs.writeFileSync(`./docs/api/${file.name.toLowerCase()}.html`, html);
});