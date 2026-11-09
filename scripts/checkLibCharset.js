'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// V8 stores a module's source as a two-byte string if it has a single
// character above U+00FF, which doubles the memory the source takes.
const dir = path.join(__dirname, '..', 'lib');
for (const file of fs.readdirSync(dir, { recursive: true }).filter(f => f.endsWith('.js'))) {
  const code = fs.readFileSync(path.join(dir, file), 'utf8');
  const match = code.match(/[\u0100-\uffff]/);
  assert.ok(!match, `lib/${file} has ${match} at line ${code.slice(0, match?.index).split('\n').length}`);
}
