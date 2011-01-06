require.paths.unshift("./spec/lib");
var sys = require('sys');
for (var key in sys)
	GLOBAL[key] = sys[key];

mongo = require("../lib/mongodb")

require("jspec")

var posix = require('fs')

fs = require('fs')
quit = process.exit
print = puts

readFile = function(path) {
  return posix.readFileSync(path);
}

if (process.ARGV[2])
  JSpec.exec('spec/spec.' + process.ARGV[2] + '.js')  
else
  JSpec
    .exec('spec/spec.bson.js')
    .exec('spec/spec.commands.js')
    .exec('spec/spec.objectid.js')
JSpec.run({ reporter: JSpec.reporters.Terminal, failuresOnly: true })
JSpec.report()

