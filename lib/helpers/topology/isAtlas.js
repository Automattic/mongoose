'use strict';

const getConstructorName = require('../getConstructorName');

module.exports = function isAtlas(topologyDescription) {
  if (getConstructorName(topologyDescription) !== 'TopologyDescription') {
    return false;
  }

  const hostnames = Array.from(topologyDescription.servers.keys());
  return hostnames.length > 0 &&
    hostnames.every(host => host.endsWith('.mongodb.net:27017'));
};