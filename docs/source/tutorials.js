'use strict';
const { mapSubDoc } = require('./utils');

mapSubDoc('tutorials', {
  title: 'Mongoose Tutorials:',
  acquit: true,
  markdown: true
}, module.exports);
