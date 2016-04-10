
/*!
 * Connection states
 */

const STATES = module.exports = exports = Object.create(null);

const disconnected = 'disconnected';
const connected = 'connected';
const connecting = 'connecting';
const disconnecting = 'disconnecting';
const unauthorized = 'unauthorized';
const uninitialized = 'uninitialized';

STATES[0] = disconnected;
STATES[1] = connected;
STATES[2] = connecting;
STATES[3] = disconnecting;
STATES[4] = unauthorized;
STATES[99] = uninitialized;

STATES[disconnected] = 0;
STATES[connected] = 1;
STATES[connecting] = 2;
STATES[disconnecting] = 3;
STATES[unauthorized] = 4;
STATES[uninitialized] = 99;
