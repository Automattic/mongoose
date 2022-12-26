'use strict';

const fs = require('fs');

const stdin = fs.readFileSync(0).toString('utf8');
const maxInstantiations = isNaN(process.argv[2]) ? 100_000 : +process.argv[2];

console.log(stdin);

const numInstantiations = stdin.match(/Instantiations:\s+(\d+)/)[1];
if (numInstantiations > maxInstantiations) {
  throw new Error(`Instantiations ${numInstantiations} > max ${maxInstantiations}`);
}

process.exit(0);