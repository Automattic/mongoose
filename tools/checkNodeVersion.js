const version = process.version;
const semver = require('semver');

// Gnarly but this helps us avoid running eslint on node v4.
if (!semver.satisfies(version, process.argv[2])) {
  throw new Error(`${version} does not satisfy "${process.argv[2]}"`);
}
