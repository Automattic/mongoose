'use strict';

/*!
 * Module dependencies.
 */

const EventEmitter = require('events').EventEmitter;

/*!
 * ignore
 */

class ChangeStream extends EventEmitter {
  constructor(changeStreamThunk, pipeline, options) {
    super();

    this.driverChangeStream = null;
    this.closed = false;
    this.pipeline = pipeline;
    this.options = options;

    // This wrapper is necessary because of buffering.
    changeStreamThunk((err, driverChangeStream) => {
      if (err != null) {
        this.emit('error', err);
        return;
      }

      this.driverChangeStream = driverChangeStream;
      this._bindEvents();
      this.emit('ready');
    });
  }

  _bindEvents() {
    this.driverChangeStream.on('close', () => {
      this.closed = true;
    });

    ['close', 'change', 'end', 'error'].forEach(ev => {
      this.driverChangeStream.on(ev, data => this.emit(ev, data));
    });
  }

  _queue(cb) {
    this.once('ready', () => cb());
  }

  close() {
    this.closed = true;
    if (this.driverChangeStream) {
      this.driverChangeStream.close();
    }
  }
}

/*!
 * ignore
 */

module.exports = ChangeStream;
