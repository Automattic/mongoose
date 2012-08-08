
/*!
 * Connection states
 */

var STATES = module.exports = exports = Object.create(null);

var disconnected = 'disconnected';
var connected = 'connected';
var connecting = 'connecting';
var disconnecting = 'disconnecting';
var uninitialized = 'uninitialized';

STATES[0] = disconnected;
STATES[1] = connected;
STATES[2] = connecting;
STATES[3] = disconnecting;
STATES[99] = uninitialized;

STATES[disconnected] = 0;
STATES[connected] = 1;
STATES[connecting] = 2;
STATES[disconnecting] = 3;
STATES[uninitialized] = 99;
