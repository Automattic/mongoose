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
    files: [
      'docs/api.md'
    ]
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

function appendLLMsSection(lines, title, entries) {
  if (entries.length === 0) {
    return;
  }
  lines.push(`## ${title}`);
  lines.push('');
  lines.push(...entries);
  lines.push('');
}

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
    '- Description: Overview of Mongoose documentation, guides, API docs, and community resources.',
    `- URL: ${llmsBaseUrl}/`,
    ''
  ];

  const includedFiles = new Set();
  for (const section of llmsSections) {
    const entries = [];
    for (const file of section.files) {
      const doc = docsFilemap.fileMap[file];
      if (!doc?.markdown) {
        continue;
      }
      includedFiles.add(file);
      entries.push(`- [${doc.title}](${llmsBaseUrl}/${file})`);
    }
    appendLLMsSection(lines, section.title, entries);
  }

  const tutorialFiles = [];
  for (const entry of Object.entries(docsFilemap.fileMap)) {
    const [file] = entry;
    if (file.startsWith('docs/tutorials/') && file.endsWith('.md')) {
      tutorialFiles.push(entry);
    }
  }
  tutorialFiles.sort(([_nameA, fileA], [_nameB, fileB]) => fileA.title.localeCompare(fileB.title));

  const tutorialEntries = [];
  for (const [name, file] of tutorialFiles) {
    includedFiles.add(name);
    tutorialEntries.push(`- [${file.title}](${llmsBaseUrl}/${name})`);
  }
  appendLLMsSection(lines, 'Tutorials', tutorialEntries);

  const typescriptFiles = [];
  for (const entry of Object.entries(docsFilemap.fileMap)) {
    const [file] = entry;
    if (file.startsWith('docs/typescript/') && file.endsWith('.md')) {
      typescriptFiles.push(entry);
    }
  }
  typescriptFiles.sort(([_nameA, fileA], [_nameB, fileB]) => fileA.title.localeCompare(fileB.title));

  const typescriptEntries = [];
  for (const [name, file] of typescriptFiles) {
    includedFiles.add(name);
    typescriptEntries.push(`- [${file.title}](${llmsBaseUrl}/${name})`);
  }
  appendLLMsSection(lines, 'TypeScript', typescriptEntries);

  const additionalFiles = [];
  for (const entry of Object.entries(docsFilemap.fileMap)) {
    const [file, doc] = entry;
    if (!includedFiles.has(file) && doc.markdown) {
      additionalFiles.push(entry);
    }
  }
  additionalFiles.sort(([_nameA, fileA], [_nameB, fileB]) => fileA.title.localeCompare(fileB.title));

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
