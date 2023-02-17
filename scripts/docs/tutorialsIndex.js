'use strict';

const fs = require('fs');

const dirName = "./docs/tutorials/"

const tutorials = fs.readdirSync(dirName).filter(file => file.endsWith('.md'));

module.exports = tutorials.reduce((map, filename) => {
  const content = fs.readFileSync(`${dirName}/${filename}`, 'utf8');
  map[`docs/tutorials/${filename}`] = {
    title: `Mongoose Tutorials: ${content.split('\n')[0].replace(/^#+/, '').trim()}`,
    acquit: true,
    markdown: true
  };
  return map;
}, {});
