'use strict';

const assert = require('assert');
const rimraf = require('rimraf');
const utils = require('../lib/utils');
const webpack = require('webpack');

describe('webpack', function() {
  it('works', function(done) {
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
