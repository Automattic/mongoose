'use strict';

const fs = require('fs');
const path = require('path');

const cwd = path.resolve(__dirname, '..');
const docsFilemap = require('../docs/source/index');

const llmsBaseUrl = 'https://mongoosejs.com';
const llmsTxtPath = path.join(cwd, 'docs', 'llms.txt');

const llmsSections = [
  {
    title: 'Getting Started',
    files: [
      'docs/index.md',
      'docs/guides.md'
    ]
  },
  {
    title: 'Guides',
    files: [
      'docs/guide.md',
      'docs/schematypes.md',
      'docs/connections.md',
      'docs/models.md',
      'docs/documents.md',
      'docs/subdocs.md',
      'docs/queries.md',
      'docs/validation.md',
      'docs/middleware.md',
      'docs/populate.md',
      'docs/discriminators.md',
      'docs/plugins.md',
      'docs/timestamps.md',
      'docs/transactions.md',
      'docs/typescript.md'
    ]
  },
  {
    title: 'API Reference',
    api: true
  },
  {
    title: 'Reference',
    files: [
      'docs/migrating_to_9.md',
      'docs/compatibility.md',
      'docs/version-support.md',
      'docs/faq.md',
      'docs/further_reading.md'
    ]
  },
  {
    title: 'Community',
    files: [
      'docs/enterprise.md'
    ]
  }
];

const llmsFiles = Object.entries(docsFilemap.fileMap).
  filter(([file]) => file !== 'docs/api.md').
  sort(([, fileA], [, fileB]) => fileA.title.localeCompare(fileB.title));
const llmsFileMap = Object.fromEntries(llmsFiles);

/**
 * Append an llms.txt section if there are entries to list.
 * @param {string[]} lines The full llms.txt output lines
 * @param {string} title The section title
 * @param {string[]} entries Markdown list items for this section
 * @returns {void}
 */
function appendLLMsSection(lines, title, entries) {
  if (entries.length === 0) {
    return;
  }
  lines.push(`## ${title}`);
  lines.push('');
  lines.push(...entries);
  lines.push('');
}

/**
 * Generate docs/llms.txt from the docs file map and parsed API docs.
 * @returns {Promise<void>}
 */
async function generateLLMsTXT() {
  const lines = [
    '# Mongoose',
    '',
    '> Elegant MongoDB object modeling for Node.js.',
    '',
    '**Overview**',
    '',
    'Mongoose provides schema-based modeling, validation, casting, middleware, query building, and API references for building MongoDB applications with Node.js.',
    '',
    '# Home Page',
    '',
    '- Description: Overview of Mongoose documentation, guides, API docs, and community resources.',
    `- URL: ${llmsBaseUrl}/`,
    ''
  ];

  const includedFiles = new Set();
  for (const section of llmsSections) {
    const entries = [];
    if (section.api) {
      const apiFiles = Array.from(docsFilemap.apiDocs.values()).
        sort((fileA, fileB) => fileA.title.localeCompare(fileB.title));

      for (const file of apiFiles) {
        const name = `docs/api/${file.fileName}.md`;
        includedFiles.add(name);
        entries.push(`- [${file.title}](${llmsBaseUrl}/${name})`);
      }

      appendLLMsSection(lines, section.title, entries);
      continue;
    }

    for (const file of section.files) {
      includedFiles.add(file);
      entries.push(`- [${llmsFileMap[file].title}](${llmsBaseUrl}/${file})`);
    }
    appendLLMsSection(lines, section.title, entries);
  }

  const tutorialFiles = llmsFiles.filter(([file]) => file.startsWith('docs/tutorials/') && file.endsWith('.md'));
  const tutorialEntries = [];
  for (const [name, file] of tutorialFiles) {
    includedFiles.add(name);
    tutorialEntries.push(`- [${file.title}](${llmsBaseUrl}/${name})`);
  }
  appendLLMsSection(lines, 'Tutorials', tutorialEntries);

  const typescriptFiles = llmsFiles.filter(([file]) => file.startsWith('docs/typescript/') && file.endsWith('.md'));
  const typescriptEntries = [];
  for (const [name, file] of typescriptFiles) {
    includedFiles.add(name);
    typescriptEntries.push(`- [${file.title}](${llmsBaseUrl}/${name})`);
  }
  appendLLMsSection(lines, 'TypeScript', typescriptEntries);

  const additionalFiles = llmsFiles.filter(([file, doc]) => !includedFiles.has(file) && doc.markdown);
  const additionalEntries = [];
  for (const [name, file] of additionalFiles) {
    additionalEntries.push(`- [${file.title}](${llmsBaseUrl}/${name})`);
  }
  appendLLMsSection(lines, 'Additional Resources', additionalEntries);

  await fs.promises.writeFile(llmsTxtPath, `${lines.join('\n').trim()}\n`);
  console.log('%s : rendered %s', (new Date()).toISOString(), llmsTxtPath);
}

module.exports = generateLLMsTXT;
module.exports.generateLLMsTXT = generateLLMsTXT;

if (require.main === module) {
  generateLLMsTXT();
}
