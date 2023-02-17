'use strict';

const fs = require('fs');

const dirName = "./docs/typescript/";

const tutorials = fs.readdirSync(dirName).filter(file => file.endsWith('.md'));

module.exports = tutorials.reduce((map, filename) => {
  const content = fs.readFileSync(`${dirName}/${filename}`, 'utf8');
  map[`docs/typescript/${filename}`] = {
    title: `Mongoose: ${content.split('\n')[0].replace(/^#+/, '').trim()}`,
    markdown: true
  };
  return map;
}, {});
