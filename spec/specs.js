
require.paths.unshift('spec', './spec/lib', 'lib')
require('jspec')

mongoose = require('../mongoose').Mongoose;
QueryWriter = require('../lib/model/queryWriter').QueryWriter;


if (process.ARGV[2])
  JSpec.exec('unit/spec.' + process.ARGV[2] + '.js')  
else
  JSpec
    .exec('unit/spec.mongoose.js')
    .exec('unit/spec.queryWriter.js')
JSpec.run({ reporter: JSpec.reporters.Terminal, fixturePath: 'spec/fixtures', failuresOnly: false })
JSpec.report()
