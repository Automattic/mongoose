'use strict';

module.exports = function allServersUnknown(topologyDescription) {
  if (topologyDescription == null ||
      topologyDescription.constructor.name !== 'TopologyDescription') {
    return false;
  }

  const servers = Array.from(topologyDescription.servers.values());
  return servers.length > 0 && servers.every(server => server.type === 'Unknown');
};