'use strict';

import { createRequire } from "node:module";
import process from "node:process";
import { resolve } from "node:path";
import {fileURLToPath} from "node:url";

import { spawn } from "node:child_process";

Error.stackTraceLimit = 100;

const require = createRequire(import.meta.url);

const fixtures = require('./mocha-fixtures.js')

await fixtures.mochaGlobalSetup();

const child_args = [
  // args is required to be set manually, because there is currently no way to get all arguments from deno
  '--allow-env', '--allow-read', '--allow-net', '--allow-run', '--allow-sys', '--allow-write',
  ...Deno.args,
  resolve(fileURLToPath(import.meta.url), '../deno_mocha.js')
];

const child = spawn(process.execPath, child_args, { stdio: 'inherit' });

child.on('exit', (code, signal) => {
  signal ? doExit(-100) : doExit(code);
});

Deno.addSignalListener("SIGINT", () => {
  console.log("SIGINT");
  child.kill("SIGINT");
  doExit(-2);
});

async function doExit(code) {
  await fixtures.mochaGlobalTeardown();
  Deno.exit(code);
}
