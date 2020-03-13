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
    this.timeout(90000);
    // acquit:ignore:end
    const webpackBundle = require('../webpack.config.js');
    const webpackBundleForTest = Object.assign({}, webpackBundle, {
      output: Object.assign({}, webpackBundle.output, { path: `${__dirname}/files` })
    });
    webpack(webpackBundleForTest, utils.tick(function(bundleBuildError, bundleBuildStats) {
      assert.ifError(bundleBuildError);
      assert.deepEqual(bundleBuildStats.compilation.errors, []);

      // Avoid expressions in `require()` because that scares webpack (gh-6705)
      assert.ok(!bundleBuildStats.compilation.warnings.
        find(msg => msg.toString().startsWith('ModuleDependencyWarning:')));

      const bundleContent = fs.readFileSync(`${__dirname}/files/dist/browser.umd.js`, 'utf8');

      acorn.parse(bundleContent, { ecmaVersion: 5 });

      const baseConfig = require('../webpack.base.config.js');
      const config = Object.assign({}, baseConfig, {
        entry: ['./test/files/sample.js'],
        // acquit:ignore:start
        output: {
          path: `${__dirname}/files`
        }
        // acquit:ignore:end
      });
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
    }));
  });
});
