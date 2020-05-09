'use strict';

module.exports = function isAtlas(topologyDescription) {
  if (topologyDescription == null ||
    topologyDescription.constructor.name !== 'TopologyDescription') {
    return false;
  }

  return Array.from(topologyDescription.servers.keys()).
    every(host => host.endsWith('.mongodb.net:27017'));
};