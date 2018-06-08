'use strict';

const assert = require('assert');
const rimraf = require('rimraf');
const utils = require('../lib/utils');
const semver = require('semver');

describe('webpack', function() {
  it('works', function(done) {
    // Webpack doesn't work on Node.js 4.x or 5.x
    if (!semver.satisfies(process.version, '>=6.0.0')) {
      this.skip();
    }
    const webpack = require('webpack');
    this.timeout(30000);

    const config = {
      entry: ['./browser.js'],
      module: {
        rules: [
          {
            test: /\.js$/,
            exclude: /node_modules/i,
            loader: 'babel-loader'
          }
        ]
      },
      target: 'node'
    };
    webpack(config, utils.tick(function(error, stats) {
      assert.ifError(error);
      assert.deepEqual(stats.compilation.errors, []);
      done();
    }));
  });

  after(function(done) {
    rimraf('./dist', done);
  });
});
