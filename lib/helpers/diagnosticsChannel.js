'use strict';

/*!
 * Safe access to node:diagnostics_channel tracingChannel.
 * Returns null if unavailable (Node < 20, Deno, or load failure).
 */

let _tracingChannel = null;

function getTracingChannelFn() {
  if (_tracingChannel != null) {
    return _tracingChannel;
  }
  try {
    const dc = require('node:diagnostics_channel');
    if (typeof dc.tracingChannel === 'function') {
      _tracingChannel = dc.tracingChannel;
      return _tracingChannel;
    }
  } catch {
    /* diagnostics_channel unavailable */
  }
  _tracingChannel = false;
  return null;
}

function getTracingChannel(name) {
  const fn = getTracingChannelFn();
  if (!fn) {
    return null;
  }
  try {
    return fn(name);
  } catch {
    return null;
  }
}

module.exports = { getTracingChannel };
