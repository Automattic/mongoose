'use strict';

const dc = process.getBuiltinModule('node:diagnostics_channel');

const hasTracingChannel = typeof dc.tracingChannel === 'function';

function shouldTrace(channel) {
  // Node 18 and Bun don't expose hasSubscribers on TracingChannel
  // so undefined means it may or may not have subscribers, so we'll trace anyway
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
