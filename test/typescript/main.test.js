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
    assert.ok(errors[0].messageText.includes('\'string\' is not assignable'), errors[0].messageText);
  });
});

function runTest(file) {
  const program = typescript.createProgram([`${__dirname}/${file}`], tsconfig);

  let emitResult = program.emit();

  return typescript.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
}