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
    this.bindedEvents = false;
    this.pipeline = pipeline;
    this.options = options;

    // This wrapper is necessary because of buffering.
    changeStreamThunk((err, driverChangeStream) => {
      if (err != null) {
        this.emit('error', err);
        return;
      }

      this.driverChangeStream = driverChangeStream;
      this.emit('ready');
    });
  }

  _bindEvents() {
    if (this.bindedEvents) {
      return;
    }

    this.bindedEvents = true;

    if (this.driverChangeStream == null) {
      this.once('ready', () => {
        this.driverChangeStream.on('close', () => {
          this.closed = true;
        });

        ['close', 'change', 'end', 'error'].forEach(ev => {
          this.driverChangeStream.on(ev, data => this.emit(ev, data));
        });
      });

      return;
    }

    this.driverChangeStream.on('close', () => {
      this.closed = true;
    });

    ['close', 'change', 'end', 'error'].forEach(ev => {
      this.driverChangeStream.on(ev, data => {
        this.emit(ev, data);
      });
    });
  }

  hasNext(cb) {
    return this.driverChangeStream.hasNext(cb);
  }

  next(cb) {
    return this.driverChangeStream.next(cb);
  }

  on(event, handler) {
    this._bindEvents();
    return super.on(event, handler);
  }

  once(event, handler) {
    this._bindEvents();
    return super.once(event, handler);
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
