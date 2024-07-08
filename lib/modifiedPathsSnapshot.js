'use strict';

module.exports = class ModifiedPathsSnapshot {
  constructor(subdocSnapshot, activePaths, version) {
    this.subdocSnapshot = subdocSnapshot;
    this.activePaths = activePaths;
    this.version = version;
  }
};
