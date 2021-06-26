'use strict';
const child_process = require('child_process');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');

// For starting/stopping mongod to test connections
// Adapted from mongodb-topology-manager:
// https://github.com/mongodb-js/mongodb-topology-manager/blob/master/lib/server.js
class Server {
  constructor(binary, options) {
    this.binary = binary;
    this.port = options['port'] || 27017;
    this.bind_ip = options['bind_ip'] || '127.0.0.1';
    this.dbpath = options['dbpath'] || './data';
  }

  // Start server
  start() {
    const self = this;
    return new Promise(function(resolve, reject) {
      self.purge().then(function() {
        // Spawn server process
        self.server = child_process.spawn(self.binary,
          ['--port', self.port, '--bind_ip',
            self.bind_ip, '--dbpath', self.dbpath]);

        // Wait for ready
        self.server.stdout.on('data', function(data) {
          if (data.toString().includes('Waiting for connections')) {
            self.server.stdout.removeAllListeners('data');
            self.server.removeAllListeners('exit');
            resolve();
          }
        });

        // Error
        self.server.on('exit', function(code) {
          reject(code);
        });
      }).catch(function(err) {
        reject(err);
      });
    });
  }

  // Stop server
  stop() {
    const self = this;
    return new Promise(function(resolve) {
      if (!self.server) {
        resolve();
      }
      // Resolve on exit
      self.server.on('exit', function(code) {
        self.server.stdout.removeAllListeners('data');
        self.server.removeAllListeners('exit');
        self.server = null;
        resolve(code);
      });
      // Kill
      self.server.kill('SIGINT');
    });
  }

  // Remove and recreate data directory
  purge() {
    const self = this;
    return new Promise(function(resolve, reject) {
      rimraf(self.dbpath, {}, function(err) {
        if (err) reject(err);
        mkdirp(self.dbpath, { recursive: true }, function(err) {
          if (err) reject(err);
          resolve();
        });
      });
    });
  }
}
module.exports = Server;
