'use strict';

const { exec } = require('child_process');

exec(`../../../node_modules/.bin/tsc --extendedDiagnostics`, { cwd: `${__dirname}/typescript/simple` }, (err, stdout, stderr) => {
  if (err) {
    console.error(err);
    console.error(stdout);
    console.error(stderr);
    process.exit(-1);
  }

  const lines = stdout.split('\n');

  const instantiations = +lines.find(line => line.startsWith('Instantiations:')).match(/\d+/)[0];
  const memoryUsed = +lines.find(line => line.startsWith('Memory used:')).match(/\d+/)[0];
  const checkTime = +lines.find(line => line.startsWith('Check time:')).match(/\d+(\.\d+)?/)[0];
  const totalTime = +lines.find(line => line.startsWith('Total time:')).match(/\d+(\.\d+)?/)[0];

  console.log(instantiations);
  console.log(memoryUsed);
  console.log(checkTime);
  console.log(totalTime);
  process.exit(0);
});