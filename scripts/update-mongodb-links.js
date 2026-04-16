'use strict';

const pkg = require('../package.json');
const fs = require('fs/promises');
const glob = require('glob');
const path = require('path');

/** Files or Directories to start searching from, relative to the project root */
const scanStarts = [
  'docs/**/*.md',
  'docs/**/*.pug',
  'lib/**/*.js',
  'types/**/*.ts',
  'README.md'
];
/** The project root dir, to start `scanStarts` in */
const startDir = path.resolve(__dirname, '..');

/** Find all urls that start with "https://mongodb.github.io/node-mongodb-native/MAJOR.MINOR/" */
const mongodbRegex = /https:\/\/mongodb\.github\.io\/node-mongodb-native\/(\d+\.\d+\/)/g;
/** The regex to extract the MAJOR.MINOR version from the package dependencies field */
const mongodbDepRegex = /\d+\.\d+/;
/**
 * The mongodb version, as extracted via {@link mongodbDepRegex} from the package.json
 * @type {string|undefined}
 */
let currentMongodbVersion = undefined;

/**
 * Map <https://mongodb.github.io/node-mongodb-native/MAJOR.MINOR/> urls to their current mongodb's version.
 * @param {string} block The String block to look for urls
 * @returns {string} The modified Block
 */
function mapURLsMongoDb(block) {
  if (currentMongodbVersion === undefined) {
    throw new Error('Expected `currentMongodbVersion` to be defined at this point');
  }

  let match;

  let out = '';
  let lastIndex = 0;

  while ((match = mongodbRegex.exec(block)) !== null) {
    // cant just use "match.index" by itself, because of the extra "href=\"" condition, which is not factored in in "match.index"
    const startIndex = match.index + match[0].length - match[1].length;
    out += block.slice(lastIndex, startIndex);
    lastIndex = startIndex + match[1].length;

    out += currentMongodbVersion;
    out += '/';
  }

  out += block.slice(lastIndex);

  return out;
}

async function main() {
  if (currentMongodbVersion === undefined) {
    currentMongodbVersion = pkg?.dependencies?.['mongodb']?.match(mongodbDepRegex)?.[0];
    if (currentMongodbVersion === undefined) {
      throw new Error('Cannot replace mongodb version links due to not being able to extract version from dependencies!');
    }
  }

  const promises = [];

  for await (const dirent of glob.iterate(scanStarts, { withFileTypes: true, cwd: startDir, nodir: true })) {
    // this *should* already be filtered-out by the "nodir" option, but just to be sure
    if (!dirent.isFile()) {
      continue;
    }

    const fullPath = dirent.fullpath();

    const promise = fs.readFile(fullPath, { encoding: 'utf8' }).then(text => fs.writeFile(fullPath, mapURLsMongoDb(text)));

    promises.push(promise);
  }

  await Promise.allSettled(promises);
}

main();
