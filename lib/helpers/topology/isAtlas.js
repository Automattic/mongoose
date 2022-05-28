'use strict';

const getConstructorName = require('../getConstructorName');

module.exports = function isAtlas(topologyDescription) {
  if (getConstructorName(topologyDescription) !== 'TopologyDescription') {
    return false;
  }

  const hostnames = Array.from(topologyDescription.servers.keys());

  if (hostnames.length === 0) {
    return false;
  }

  for (let i = 0, il = hostnames.length; i < il; ++i) {
    const url = new URL(hostnames[i]);
    if (
      url.hostname.endsWith('.mongodb.net') === false ||
      url.port !== '27017'
    ) {
      return false;
    }
  }
  return true;
};