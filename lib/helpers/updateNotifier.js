'use strict';
const updateNotifier = require('update-notifier');
const pkg = require('../../package.json');

run().catch(console.error);

async function run() {
  const notifier = await updateNotifier({
    pkg,
    updateCheckInterval: 0
  });

  notifier.notify();
}