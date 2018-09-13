'use strict';

const acorn = require('acorn');
const assert = require('assert');
const fs = require('fs');
const utils = require('../lib/utils');
const semver = require('semver');

describe('webpack', function() {
  it('works for browser build', function(done) {
    // Below is the Webpack config Mongoose uses for testing
    // acquit:ignore:start
    // Webpack doesn't work on Node.js 4.x or 5.x, and very slow on
    // Travis with 6.x and 7.x.
    if (!semver.satisfies(process.version, '>=8.0.0')) {
      this.skip();
    }
    const webpack = require('webpack');
    this.timeout(45000);
    // acquit:ignore:end
    const config = {
      entry: ['./test/files/sample.js'],
      // acquit:ignore:start
      output: {
        path: `${__dirname}/files`
      },
      // acquit:ignore:end
      module: {
        rules: [
          {
            test: /\.js$/,
            include: [
              /\/mongoose\//i,
              /\/kareem\//i
            ],
            loader: 'babel-loader',
            options: {
              presets: ['es2015']
            }
          }
        ]
      },
      node: {
        // Replace these Node.js native modules with empty objects, Mongoose's
        // browser library does not use them.
        // See https://webpack.js.org/configuration/node/
        dns: 'empty',
        fs: 'empty',
        'module': 'empty',
        net: 'empty',
        tls: 'empty'
      },
      target: 'web',
      mode: 'production'
    };
    // acquit:ignore:start
    webpack(config, utils.tick(function(error, stats) {
      assert.ifError(error);
      assert.deepEqual(stats.compilation.errors, []);

      // Avoid expressions in `require()` because that scares webpack (gh-6705)
      assert.ok(!stats.compilation.warnings.
        find(msg => msg.toString().startsWith('ModuleDependencyWarning:')));

      const content = fs.readFileSync(`${__dirname}/files/main.js`, 'utf8');

      acorn.parse(content, { ecmaVersion: 5 });

      done();
    }));
    // acquit:ignore:end
  });
});
