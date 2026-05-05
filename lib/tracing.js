'use strict';

const dc = process.getBuiltinModule('node:diagnostics_channel');

const hasTracingChannel = typeof dc.tracingChannel === 'function';

function shouldTrace(channel) {
  return !!channel && channel.hasSubscribers !== false;
}

const noop = () => {};

const channel = hasTracingChannel
  ? dc.tracingChannel('mongoose:query')
  : undefined;

function trace(fn, contextFactory) {
  if (shouldTrace(channel)) {
    const traced = channel.tracePromise(fn, contextFactory());
    traced.catch(noop);
    return traced;
  }
  return fn();
}

module.exports = {
  channel,
  trace,
  shouldTrace
};
