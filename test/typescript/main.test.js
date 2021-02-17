'use strict';

const assert = require('assert');
const typescript = require('typescript');
const tsconfig = require('./tsconfig.json');

describe('typescript syntax', function() {
  this.timeout(60000);

  it('base', function() {
    const errors = runTest('base.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 0);
  });

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

  it('handles maps', function() {
    const errors = runTest('maps.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 0);
  });

  it('subdocuments', function() {
    const errors = runTest('subdocuments.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 0);
  });

  it('queries', function() {
    const errors = runTest('queries.ts', { strict: true });
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
    const errors = runTest('discriminator.ts', { strict: true });
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
    assert.equal(errors.length, 3);
    assert.ok(errors[0].messageText.includes('Property \'save\' does not exist'), errors[0].messageText);
    assert.ok(errors[1].messageText.includes('Property \'save\' does not exist'), errors[1].messageText);
    assert.ok(errors[2].messageText.includes('Property \'testMethod\' does not exist'), errors[2].messageText);
  });

  it('doc array', function() {
    const errors = runTest('docArray.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 1);
    assert.ok(errors[0].messageText.includes('Property \'create\' does not exist'), errors[0].messageText);
  });

  it('objectid', function() {
    const errors = runTest('objectid.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 0);
  });

  it('global', function() {
    const errors = runTest('global.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 0);
  });

  it('collection', function() {
    const errors = runTest('collection.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 0);
  });

  it('models', function() {
    const errors = runTest('models.ts');
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 0);
  });

  it('methods', function() {
    const errors = runTest('methods.ts', { strict: true });
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 0);
  });

  it('schema', function() {
    const errors = runTest('schema.ts', { strict: true });
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 1);
    const messageText = errors[0].messageText.messageText;
    assert.ok(/Type '.*StringConstructor.*' is not assignable to type.*number/.test(messageText), messageText);
  });

  it('document', function() {
    const errors = runTest('document.ts', { strict: true });
    if (process.env.D && errors.length) {
      console.log(errors);
    }
    assert.equal(errors.length, 0);
  });
});

function runTest(file, configOverride) {
  const program = typescript.createProgram([`${__dirname}/${file}`], Object.assign({}, tsconfig, configOverride));

  const emitResult = program.emit();

  return typescript.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
}