'use strict';

const assert = require('assert');
const { spawnSync } = require('child_process');

describe('document projection memory', function() {
  this.timeout(15000);

  for (const inclusive of [true, false]) {
    it(`keeps flat ${inclusive ? 'inclusive' : 'exclusive'} selection metadata small`, function() {
      // Arrange
      const { measure } = createTestContext({ inclusive });

      // Act
      const additionalHeap = measure();

      // Assert: 1,000 documents must not each retain a 1,024-key array.
      assert.ok(additionalHeap < 2 * 1024 * 1024,
        `Selection metadata retained ${(additionalHeap / 1024 / 1024).toFixed(2)} MiB`);
    });
  }

  function createTestContext({ inclusive }) {
    return { measure };

    function measure() {
      // The Deno suite also loads this file; heap accounting here is specific to Node.
      const executable = typeof Deno === 'undefined' ? process.execPath : 'node';
      const result = spawnSync(executable, ['--expose-gc', '-e', `(${measureHeap})(${inclusive})`], {
        encoding: 'utf8', timeout: 10000, killSignal: 'SIGKILL'
      });
      assert.strictEqual(result.status, 0, String(result.error || result.stderr));
      return JSON.parse(result.stdout);
    }
  }

  function measureHeap(inclusive) {
    const assert = require('assert');
    const mongoose = require(process.cwd());
    const Contact = mongoose.model('Contact', new mongoose.Schema({ name: String }));
    const projection = { name: inclusive ? 1 : 0 };
    for (let i = 0; i < 1023; ++i) {
      projection[`field${i}`] = inclusive ? 1 : 0;
    }
    for (let i = 0; i < 100; ++i) {
      Contact.hydrate({ name: 'Ada' }, projection).isSelected('missing');
    }
    const contacts = Array.from({ length: 1000 }, () => Contact.hydrate({ name: 'Ada' }, projection));
    global.gc();
    const before = process.memoryUsage().heapUsed;
    for (const contact of contacts) {
      assert.strictEqual(contact.isSelected('missing'), !inclusive);
      assert.strictEqual(contact.isDirectSelected('missing'), !inclusive);
    }
    global.gc();
    const additionalHeap = process.memoryUsage().heapUsed - before;
    // Keep the documents reachable until after measuring their selection metadata.
    assert.strictEqual(contacts[999].isSelected('name'), inclusive);
    console.log(JSON.stringify(additionalHeap));
  }
});
