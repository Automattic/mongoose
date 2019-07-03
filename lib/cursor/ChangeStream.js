'use strict';

/*!
 * Module dependencies.
 */

const EventEmitter = require('events').EventEmitter;

/*!
 * ignore
 */

class ChangeStream extends EventEmitter {
  constructor(model, pipeline, options) {
    super();

    this.driverChangeStream = null;
    this.closed = false;
    // This wrapper is necessary because of buffering.
    if (model.collection.buffer) {
      model.collection.addQueue(() => {
        if (this.closed) {
          return;
        }
        this.driverChangeStream = model.collection.watch(pipeline, options);
        this._bindEvents();
        this.emit('ready');
      });
    } else {
      this.driverChangeStream = model.collection.watch(pipeline, options);
      this._bindEvents();
      this.emit('ready');
    }
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
