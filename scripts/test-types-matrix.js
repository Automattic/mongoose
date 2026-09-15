'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseArgs } = require('node:util');

const { values } = parseArgs({
  options: {
    exactOptionalPropertyTypes: { type: 'string' },
    skipLibCheck: { type: 'string' },
    strict: { type: 'string' },
    typescript: { type: 'string' }
  }
});

if (values.typescript == null) {
  throw new Error('The --typescript option is required');
}

const parseBoolean = name => {
  const value = values[name];
  if (value !== 'true' && value !== 'false') {
    throw new Error(`The --${name} option must be either true or false`);
  }
  return value === 'true';
};

const compilerOptions = {
  exactOptionalPropertyTypes: parseBoolean('exactOptionalPropertyTypes'),
  skipLibCheck: parseBoolean('skipLibCheck'),
  strict: parseBoolean('strict')
};
// TypeScript requires strictNullChecks when exactOptionalPropertyTypes is set,
// even when the rest of strict mode is disabled.
compilerOptions.strictNullChecks = compilerOptions.strict || compilerOptions.exactOptionalPropertyTypes;
const projectRoot = path.resolve(__dirname, '..');
const typescriptPackage = require(path.join(projectRoot, 'node_modules/typescript/package.json'));

if (typescriptPackage.version !== values.typescript) {
  throw new Error(
    `Expected TypeScript ${values.typescript}, but found ${typescriptPackage.version}. Install the expected version before running the matrix.`
  );
}

const tsconfig = {
  extends: path.join(projectRoot, 'tsconfig.json'),
  compilerOptions: {
    ...compilerOptions,
    noEmit: true,
    typeRoots: [path.join(projectRoot, 'node_modules/@types')]
  },
  files: [path.join(projectRoot, 'test/types/typescript-matrix.test.ts')]
};
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mongoose-types-'));
const tsconfigPath = path.join(temporaryDirectory, 'tsconfig.json');
const tscBin = path.join(projectRoot, 'node_modules/typescript/bin/tsc');

try {
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig));

  const showConfig = spawnSync(process.execPath, [tscBin, '--project', tsconfigPath, '--showConfig'], {
    cwd: projectRoot,
    encoding: 'utf8'
  });
  if (showConfig.error != null) {
    throw showConfig.error;
  }
  if (showConfig.status !== 0) {
    throw new Error(showConfig.stderr || `TypeScript --showConfig exited with status ${showConfig.status}`);
  }

  const resolvedConfig = JSON.parse(showConfig.stdout);
  for (const [name, expectedValue] of Object.entries(compilerOptions)) {
    if (resolvedConfig.compilerOptions[name] !== expectedValue) {
      throw new Error(
        `Expected compilerOptions.${name} to resolve to ${expectedValue}, but got ${resolvedConfig.compilerOptions[name]}`
      );
    }
  }

  console.log(`TypeScript ${typescriptPackage.version}, ${Object.entries(compilerOptions)
    .map(([name, value]) => `${name}=${value}`)
    .join(', ')}`);

  const result = spawnSync(process.execPath, [tscBin, '--project', tsconfigPath], {
    cwd: projectRoot,
    stdio: 'inherit'
  });
  if (result.error != null) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  }
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
