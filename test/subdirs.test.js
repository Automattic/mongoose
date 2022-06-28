'use strict';

const fs = require('fs');

let files = fs.readdirSync(`${__dirname}/docs`);

for (const file of files) {
  require(`./docs/${file}`);
}

files = fs.readdirSync(`${__dirname}/helpers`);

for (const file of files) {
  require(`./helpers/${file}`);
}
