/*!
 * Nodeunit
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var nodeunit = require('../nodeunit'),
    utils = require('../utils'),
    fs = require('fs'),
    sys = require('sys'),
    track = require('../track'),
    path = require('path');
    AssertionError = require('../assert').AssertionError;

/**
 * Reporter info string
 */

exports.info = "Default tests reporter";


/**
 * Run all tests within each module, reporting the results to the command-line.
 *
 * @param {Array} files
 * @api public
 */

exports.run = function (files, options, callback) {

    if (!options) {
        // load default options
        var content = fs.readFileSync(
            __dirname + '/../../bin/nodeunit.json', 'utf8'
        );
        options = JSON.parse(content);
    }

    var error = function (str) {
        return options.error_prefix + str + options.error_suffix;
    };
    var ok    = function (str) {
        return options.ok_prefix + str + options.ok_suffix;
    };
    var bold  = function (str) {
        return options.bold_prefix + str + options.bold_suffix;
    };
    var assertion_message = function (str) {
        return options.assertion_prefix + str + options.assertion_suffix;
    };

    var start = new Date().getTime();
    var paths = files.map(function (p) {
        return path.join(process.cwd(), p);
    });
    var tracker = track.createTracker(function (tracker) {
        if (tracker.unfinished()) {
            sys.puts('');
            sys.puts(error(bold(
                'FAILURES: Undone tests (or their setups/teardowns): '
            )));
            var names = tracker.names();
            for (var i = 0; i < names.length; i += 1) {
                sys.puts('- ' + names[i]);
            }
            sys.puts('');
            sys.puts('To fix this, make sure all tests call test.done()');
            process.reallyExit(tracker.unfinished());
        }
    });

    nodeunit.runFiles(paths, {
        moduleStart: function (name) {
            sys.puts('\n' + bold(name));
        },
        testDone: function (name, assertions) {
            tracker.remove(name);

            if (!assertions.failures()) {
                sys.puts('✔ ' + name);
            }
            else {
                sys.puts(error('✖ ' + name) + '\n');
                assertions.forEach(function (a) {
                    if (a.failed()) {
                        a = utils.betterErrors(a);
                        if (a.error instanceof AssertionError && a.message) {
                            sys.puts(
                                'Assertion Message: ' +
                                assertion_message(a.message)
                            );
                        }
                        sys.puts(a.error.stack + '\n');
                    }
                });
            }
        },
        done: function (assertions) {
            var end = new Date().getTime();
            var duration = end - start;
            if (assertions.failures()) {
                sys.puts(
                    '\n' + bold(error('FAILURES: ')) + assertions.failures() +
                    '/' + assertions.length + ' assertions failed (' +
                    assertions.duration + 'ms)'
                );
            }
            else {
                sys.puts(
                    '\n' + bold(ok('OK: ')) + assertions.length +
                    ' assertions (' + assertions.duration + 'ms)'
                );
            }
            // alexgorbatchev 2010-11-10 :: should be able to flush stdout
            // here, but doesn't seem to work, instead delay the exit to give
            // enough to time flush.
            // process.stdout.flush()
            // process.stdout.end()
            var timer = setTimeout(function () {
               clearTimeout(timer);
              
              if(callback != null) {
                return callback();
              } else {                
                process.reallyExit(assertions.failures());
              }              
            }, 10);
        },
        testStart: function(name) {
            tracker.put(name);
        }
    });
};
