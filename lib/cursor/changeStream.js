'use strict';

/*!
 * Module dependencies.
 */

const EventEmitter = require('events').EventEmitter;
const MongooseError = require('../error/mongooseError');

/*!
 * ignore
 */

const driverChangeStreamEvents = ['close', 'change', 'end', 'error', 'resumeTokenChanged'];

/*!
 * ignore
 */

class ChangeStream extends EventEmitter {
  constructor(changeStreamPromise, pipeline, options) {
    super();

    this.driverChangeStream = null;
    this.closed = false;
    this.bindedEvents = false;
    this.pipeline = pipeline;
    this.options = options;
    this.errored = false;

    if (options?.hydrate && !options.model) {
      throw new Error(
        'Cannot create change stream with `hydrate: true` ' +
        'unless calling `Model.watch()`'
      );
    }

    this.$driverChangeStreamPromise = changeStreamPromise.then(
      driverChangeStream => {
        this.driverChangeStream = driverChangeStream;
        this.emit('ready');
      },
      err => {
        this.errored = true;
        this.emit('error', err);
        throw err;
      }
    );
  }

  _bindEvents() {
    if (this.bindedEvents) {
      return;
    }

    this.bindedEvents = true;

    if (this.driverChangeStream == null) {
      this.$driverChangeStreamPromise.then(
        () => {
          this.driverChangeStream.on('close', () => {
            this.closed = true;
          });

          driverChangeStreamEvents.forEach(ev => {
            this.driverChangeStream.on(ev, data => {
              if (data?.fullDocument != null && this.options?.hydrate) {
                data.fullDocument = this.options.model.hydrate(data.fullDocument);
              }
              this.emit(ev, data);
            });
          });
        },
        () => {} // No need to register events if opening change stream failed
      );

      return;
    }

    this.driverChangeStream.on('close', () => {
      this.closed = true;
    });

    driverChangeStreamEvents.forEach(ev => {
      this.driverChangeStream.on(ev, data => {
        if (data?.fullDocument != null && this.options?.hydrate) {
          data.fullDocument = this.options.model.hydrate(data.fullDocument);
        }
        this.emit(ev, data);
      });
    });
  }

  hasNext(cb) {
    if (this.errored) {
      throw new MongooseError('Cannot call hasNext() on errored ChangeStream');
    }

    if (this.driverChangeStream != null) {
      return this.driverChangeStream.hasNext(cb);
    }

    return this.$driverChangeStreamPromise
      .then(() => this.driverChangeStream.hasNext(cb), err => cb(err));
  }

  next(cb) {
    if (this.errored) {
      throw new MongooseError('Cannot call next() on errored ChangeStream');
    }
    if (this.options?.hydrate) {
      if (cb != null) {
        const originalCb = cb;
        cb = (err, data) => {
          if (err != null) {
            return originalCb(err);
          }
          if (data.fullDocument != null) {
            data.fullDocument = this.options.model.hydrate(data.fullDocument);
          }
          return originalCb(null, data);
        };
      }

      let maybePromise;
      if (this.driverChangeStream != null) {
        maybePromise = this.driverChangeStream.next(cb);
      } else {
        maybePromise = this.$driverChangeStreamPromise
          .then(() => this.driverChangeStream.next(cb), err => cb(err));
      }
      if (typeof maybePromise?.then === 'function') {
        maybePromise = maybePromise.then(data => {
          if (data.fullDocument != null) {
            data.fullDocument = this.options.model.hydrate(data.fullDocument);
          }
          return data;
        });
      }
      return maybePromise;
    }

    if (this.driverChangeStream != null) {
      return this.driverChangeStream.next(cb);
    }

    return this.$driverChangeStreamPromise
      .then(() => this.driverChangeStream.next(cb), err => cb(err));
  }

  addListener(event, handler) {
    if (this.errored) {
      throw new MongooseError('Cannot call addListener() on errored ChangeStream');
    }
    this._bindEvents();
    return super.addListener(event, handler);
  }

  on(event, handler) {
    if (this.errored) {
      throw new MongooseError('Cannot call on() on errored ChangeStream');
    }
    this._bindEvents();
    return super.on(event, handler);
  }

  once(event, handler) {
    if (this.errored) {
      throw new MongooseError('Cannot call once() on errored ChangeStream');
    }
    this._bindEvents();
    return super.once(event, handler);
  }

  _queue(cb) {
    this.once('ready', () => cb());
  }

  close() {
    this.closed = true;
    if (this.driverChangeStream) {
      return this.driverChangeStream.close();
    } else {
      return this.$driverChangeStreamPromise.then(
        () => this.driverChangeStream.close(),
        () => {} // No need to close if opening the change stream failed
      );
    }
  }
}

/*!
 * ignore
 */

module.exports = ChangeStream;
