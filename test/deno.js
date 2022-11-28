'use strict';

import { createRequire } from "https://deno.land/std/node/module.ts";

// Workaround for Mocha getting terminal width, which currently requires `--unstable`
Object.defineProperty(process.stdout, 'getWindowSize', {
  value: function() {
    return [75, 40];
  }
});

import { parse } from "https://deno.land/std/flags/mod.ts"
const args = parse(Deno.args);

const require = createRequire(import.meta.url);

const Mocha = require('mocha');
const fs = require('fs');
const path = require('path');

const mocha = new Mocha({
  timeout: 8000,
  ...(args.g ? { fgrep: '' + args.g } : {})
});

const testDir = 'test';
const files = fs.readdirSync(testDir).
  concat(fs.readdirSync(path.join(testDir, 'docs')).map(file => path.join('docs', file))).
  concat(fs.readdirSync(path.join(testDir, 'helpers')).map(file => path.join('helpers', file)));

const ignoreFiles = new Set(['browser.test.js']);

for (const file of files) {
  if (!file.endsWith('.test.js') || ignoreFiles.has(file)) {
    continue;
  }

  mocha.addFile(path.join(testDir, file));
}

mocha.run(function(failures) {
  process.exitCode = failures ? 1 : 0;  // exit with non-zero status if there were failures
  process.exit(process.exitCode);
});