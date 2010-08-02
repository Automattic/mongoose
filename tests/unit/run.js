require.paths.unshift('.', 'lib', 'tests/unit', 'tests/unit/support/jspec/lib')
require('jspec')
mongoose = require('mongoose')
test = require('lib/tests')
connection = require('lib/connection');
connection.Connection = test.MockConnection;

function run(specs) {
  [].concat(specs).forEach(function(spec){
    src = 'tests/unit/spec.' + spec + '.js';
    console.log(src);
    JSpec.exec(src)
  })
}

specs = {
  independant: [
    'lib.util',
    'mongoose',
    'lib.connection',
    'lib.model',
    'lib.query'
  ]
}

run(process.ARGV[2] || specs.independant)

JSpec.run({ reporter: JSpec.reporters.Terminal, failuresOnly: true }).report()