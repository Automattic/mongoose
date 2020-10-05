'use strict';

const assert = require('assert');
const typescript = require('typescript');

const tsconfig = {
  allowSyntheticDefaultImports: true,
  esModuleInterop: true,
  outDir: `${__dirname}/dist`
};

describe('typescript syntax', function() {
  this.timeout(5000);

  it('create schema and model', function() {
    const errors = runTest('createBasicSchemaDefinition.ts');
    assert.equal(errors.length, 0);
  });

  it('connect syntax', function() {
    const errors = runTest('connectSyntax.ts');
    assert.equal(errors.length, 0);
  });

  it('reports error on invalid getter syntax', function() {
    const errors = runTest('schemaGettersSetters.ts');
    assert.equal(errors.length, 1);
    assert.ok(errors[0].messageText.messageText.includes('incorrect: number'), errors[0].messageText.messageText);
  });

  it('handles maps', function() {
    const errors = runTest('maps.ts');
    assert.equal(errors.length, 1);
    assert.ok(errors[0].messageText.messageText.includes('not assignable'), errors[0].messageText.messageText);
  });

  it('subdocuments', function() {
    const errors = runTest('subdocuments.ts');
    assert.equal(errors.length, 0);
  });

  it('queries', function() {
    const errors = runTest('queries.ts');
    assert.equal(errors.length, 0);
  });

  it('create', function() {
    const errors = runTest('create.ts');
    assert.equal(errors.length, 1);
    assert.ok(errors[0].messageText.messageText.includes('No overload matches'), errors[0].messageText.messageText);
  });

  it('aggregate', function() {
    const errors = runTest('aggregate.ts');
    assert.equal(errors.length, 0);
  });

  it('discriminators', function() {
    const errors = runTest('discriminator.ts');
    assert.equal(errors.length, 0);
  });

  it('multiple connections', function() {
    const errors = runTest('connection.ts');
    assert.equal(errors.length, 0);
  });
});

function runTest(file) {
  const program = typescript.createProgram([`${__dirname}/${file}`], tsconfig);

  let emitResult = program.emit();

  return typescript.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
}