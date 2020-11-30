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
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 0);
  });

  it('connect syntax', function() {
    const errors = runTest('connectSyntax.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 0);
  });

  it('reports error on invalid getter syntax', function() {
    const errors = runTest('schemaGettersSetters.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 1);
    assert.ok(errors[0].messageText.messageText.includes('incorrect: number'), errors[0].messageText.messageText);
  });

  it('handles maps', function() {
    const errors = runTest('maps.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 1);
    assert.ok(errors[0].messageText.messageText.includes('not assignable'), errors[0].messageText.messageText);
  });

  it('subdocuments', function() {
    const errors = runTest('subdocuments.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 0);
  });

  it('queries', function() {
    const errors = runTest('queries.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 0);
  });

  it('create', function() {
    const errors = runTest('create.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 1);
    assert.ok(errors[0].messageText.messageText.includes('No overload matches'), errors[0].messageText.messageText);
  });

  it('aggregate', function() {
    const errors = runTest('aggregate.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 0);
  });

  it('discriminators', function() {
    const errors = runTest('discriminator.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 0);
  });

  it('multiple connections', function() {
    const errors = runTest('connection.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 0);
  });

  it('query cursors', function() {
    const errors = runTest('querycursor.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 0);
  });

  it('middleware', function() {
    const errors = runTest('middleware.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 1);
    assert.ok(errors[0].messageText.includes('Property \'notAFunction\' does not exist'), errors[0].messageText);
  });

  it('model inheritance', function() {
    const errors = runTest('modelInheritance.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 0);
  });

  it('lean documents', function() {
    const errors = runTest('leanDocuments.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 4);
    assert.ok(errors[0].messageText.includes('Property \'save\' does not exist'), errors[0].messageText);
    assert.ok(errors[1].messageText.includes('Property \'save\' does not exist'), errors[1].messageText);
    assert.ok(errors[2].messageText.includes('Property \'testMethod\' does not exist'), errors[2].messageText);
    assert.ok(errors[3].messageText.includes('Property \'toObject\' does not exist'), errors[3].messageText);
  });

  it('doc array', function() {
    const errors = runTest('docArray.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 1);
    assert.ok(errors[0].messageText.includes('Property \'create\' does not exist'), errors[0].messageText);
  });
});

function runTest(file) {
  const program = typescript.createProgram([`${__dirname}/${file}`], tsconfig);

  const emitResult = program.emit();

  return typescript.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
}