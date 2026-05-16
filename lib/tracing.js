'use strict';

let dc;
try {
  dc = (typeof process !== 'undefined' && 'getBuiltinModule' in process)
    ? process.getBuiltinModule('node:diagnostics_channel')
    : require('node:diagnostics_channel');
} catch {
  // diagnostics_channel not available
}

const hasTracingChannel = !!dc && typeof dc.tracingChannel === 'function';

function shouldTrace(channel) {
  // Node 18 and Bun don't expose hasSubscribers on TracingChannel
  // so undefined means it may or may not have subscribers, so we'll trace anyway
  return !!channel && channel.hasSubscribers !== false;
}

const noop = () => {};

function createTracedChannel(name) {
  const ch = hasTracingChannel ? dc.tracingChannel(name) : undefined;

  function trace(fn, contextFactory) {
    if (!shouldTrace(ch)) {
      return fn();
    }

    const traced = ch.tracePromise(fn, contextFactory());
    traced.catch(noop);
    return traced;
  }

  return { channel: ch, trace };
}

const query = createTracedChannel('mongoose:query');
const cursorNext = createTracedChannel('mongoose:cursor:next');

module.exports = {
  channel: query.channel,
  cursorNextChannel: cursorNext.channel,
  trace: query.trace,
  traceCursorNext: cursorNext.trace,
  shouldTrace
};
