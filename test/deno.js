'use strict';

import { createRequire } from "https://deno.land/std/node/module.ts";

import { parse } from "https://deno.land/std/flags/mod.ts"
const args = parse(Deno.args);

const require = createRequire(import.meta.url);

const Mocha = require('mocha');
const fs = require('fs');
const path = require('path');

const mocha = new Mocha({
  ...(args.g ? { fgrep: '' + args.g } : {})
});

const testDir = 'test';
const files = fs.readdirSync(testDir);

const ignoreFiles = new Set(['browser.test.js', 'connection.test.js', 'index.test.js']);

for (const file of files) {
  if (!file.endsWith('.test.js') || ignoreFiles.has(file)) {
    continue;
  }

  mocha.addFile(path.join(testDir, file));
}

mocha.run(function(failures) {
  process.exitCode = failures ? 1 : 0;  // exit with non-zero status if there were failures
});