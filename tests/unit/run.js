require.paths.unshift('.', 'lib', 'tests/unit', 'tests/unit/support/jspec/lib')
require('jspec')
require('mongoose')

function run(specs) {
  [].concat(specs).forEach(function(spec){
    JSpec.exec('tests/unit/spec.' + spec + '.js')
  })
}

specs = {
  independant: [
    'mongoose',
    'lib.connection',
    'lib.model',
    'lib.query'
  ]
}

run(process.ARGV[2] || specs.independant)

JSpec.run({ reporter: JSpec.reporters.Terminal, failuresOnly: true }).report()