require.paths.unshift('.', 'spec', 'lib', 'spec/support/jspec/lib')
require('jspec')
require('mongoose')

function run(specs) {
  [].concat(specs).forEach(function(spec){
    JSpec.exec('spec/unit/spec.' + spec + '.js')
  })
}

specs = {
  independant: [
    'mongoose',
    'queryWriter',
    'document',
  ]
}

run(process.ARGV[2] || specs.independant)

JSpec.run({ reporter: JSpec.reporters.Terminal, failuresOnly: true }).report()