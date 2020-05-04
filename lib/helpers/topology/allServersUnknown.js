'use strict';

module.exports = function allServersUnknown(topologyDescription) {
  if (topologyDescription == null ||
      topologyDescription.constructor.name !== 'TopologyDescription') {
    return false;
  }

  return Array.from(topologyDescription.servers.values()).
    every(server => server.type === 'Unknown');
};