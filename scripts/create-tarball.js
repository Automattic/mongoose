'use strict';

const { execSync } = require('child_process');
const { name, version } = require('../package.json');

execSync('npm pack');
execSync(`mv ${name}-${version}.tgz ${name}.tgz`);
