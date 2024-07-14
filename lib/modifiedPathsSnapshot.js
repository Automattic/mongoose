'use strict';

module.exports = class ModifiedPathsSnapshot {
  constructor(subdocSnapshot, activePaths, version, isNew) {
    this.subdocSnapshot = subdocSnapshot;
    this.activePaths = activePaths;
    this.version = version;
    this.isNew = isNew;
  }
};
