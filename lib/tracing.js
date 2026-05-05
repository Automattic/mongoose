'use strict';

const dc = process.getBuiltinModule('node:diagnostics_channel');

const hasTracingChannel = typeof dc.tracingChannel === 'function';

// @types/node is missing hasSubscribers on TracingChannel and types
// tracePromise as returning void. Both exist at runtime.
// Check explicitly for `false` rather than truthiness because `hasSubscribers`
// is not available on all Node.js versions that support TracingChannel.
// When `hasSubscribers` is `undefined` (older Node), we assume there are
// subscribers and trace unconditionally, keeping the zero-cost optimization
// only for versions where we can reliably check.
function shouldTrace(channel) {
  return !!channel && channel.hasSubscribers !== false;
}

const noop = () => {};

const queryChannel = hasTracingChannel
  ? dc.tracingChannel('mongoose:query')
  : undefined;

const aggregateChannel = hasTracingChannel
  ? dc.tracingChannel('mongoose:aggregate')
  : undefined;

const saveChannel = hasTracingChannel
  ? dc.tracingChannel('mongoose:save')
  : undefined;

const modelChannel = hasTracingChannel
  ? dc.tracingChannel('mongoose:model')
  : undefined;

function traceQuery(fn, contextFactory) {
  if (shouldTrace(queryChannel)) {
    const traced = queryChannel.tracePromise(fn, contextFactory());
    traced.catch(noop);
    return traced;
  }
  return fn();
}

function traceAggregate(fn, contextFactory) {
  if (shouldTrace(aggregateChannel)) {
    const traced = aggregateChannel.tracePromise(fn, contextFactory());
    traced.catch(noop);
    return traced;
  }
  return fn();
}

function traceSave(fn, contextFactory) {
  if (shouldTrace(saveChannel)) {
    const traced = saveChannel.tracePromise(fn, contextFactory());
    traced.catch(noop);
    return traced;
  }
  return fn();
}

function traceModel(fn, contextFactory) {
  if (shouldTrace(modelChannel)) {
    const traced = modelChannel.tracePromise(fn, contextFactory());
    traced.catch(noop);
    return traced;
  }
  return fn();
}

module.exports = {
  queryChannel,
  aggregateChannel,
  saveChannel,
  modelChannel,
  traceQuery,
  traceAggregate,
  traceSave,
  traceModel,
  shouldTrace
};
