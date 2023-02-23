'use strict';

const fs = require('fs');

const stdin = fs.readFileSync(0).toString('utf8');
const maxInstantiations = isNaN(process.argv[2]) ? 110000 : parseInt(process.argv[2], 10);

console.log(stdin);

const numInstantiations = parseInt(stdin.match(/Instantiations:\s+(\d+)/)[1], 10);
if (numInstantiations > maxInstantiations) {
  throw new Error(`Instantiations ${numInstantiations} > max ${maxInstantiations}`);
}

process.exit(0);
