'use strict';
const fs = require('fs');

/**
 * @typedef {import("./index").DocsOptions} DocsOptions
 */

/**
 * Map sub-directories with custom options
 * @param {String} subDoc Path to the subdoc, like "tutorials" (no beginning or ending slash)
 * @param {DocsOptions} options Options applied to all files in the subdoc (title gets appended to provided title)
 * @param {Object} exportsObj The "module.exports" object to apply changes to
 */
function mapSubDoc(subDoc, options, exportsObj) {
  const dirName = `docs/${subDoc}`;

  const files = fs.readdirSync(dirName).filter(file => file.endsWith('.md'));

  files.forEach((filename) => {
    const content = fs.readFileSync(`${dirName}/${filename}`, 'utf8');
    exportsObj[`${dirName}/${filename}`] = {
      ...options,
      title: `${options.title} ${content.split('\n')[0].replace(/^#+/, '').trim()}`
    };
  });
}

module.exports = mapSubDoc;
module.exports.mapSubDoc = mapSubDoc;
