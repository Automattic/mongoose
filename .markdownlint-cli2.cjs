'use strict';
// this file is named ".cjs" instead of ".js" because markdownlint-cli2 only looks for ".cjs" or ".mjs"

// use aliases instead of "MD000" naming

module.exports = {
  ignores: [
    // the following are ignored because they are just redirects
    'History.md',
    'SECURITY.md',
    'migrating_to_5.md', // this does not affect "docs/migrating_to_5.md"

    // ignored for now, but should be changes later
    '.github/PULL_REQUEST_TEMPLATE.md',

    // ignore changelog because it uses different heading style than other documents and older versions use different formatting
    'CHANGELOG.md',

    // exclude node_modules because it isnt excluded by default
    'node_modules'
  ]
};

module.exports.config = {
  // disable default rules
  default: false,

  // alt-text for images
  accessibility: true,
  // consistent blank lines
  blank_lines: true,
  // consistent unordered lists
  bullet: { style: 'asterisk' },
  // consistent and read-able code
  code: true,
  // consistent emphasis characters
  emphasis: { style: 'asterisk' },
  // ensure consistent header usage
  headers: { style: 'atx' },
  // ensure consistent "hr" usage
  hr: { style: '---' },
  // disable disalloing html tags, because
  // mongoose currently uses html tags directly for heading ID's and style
  html: false,
  // consistent indentation
  indentation: true,
  // consistent links and good links
  links: true,
  // enabled by "links"
  // mongoose currently does not wrap plain links in "<>"
  'no-bare-urls': false,
  // consistent ordered lists
  ol: true,
  // consistent whitespace usage
  whitespace: true

  // atx: undefined, // covered by "headers"
  // atx_closed: undefined, // covered by "headers"
  // blockquote: true, // covered by "whitespace"
  // hard_tab: undefined, // covered by "whitespace"
  // headings: undefined, // covered by "headers"
  // images: true, // covered by "accessibility" and "links"
  // language: undefined, // covered by "code"
  // line_length: undefined, // mongoose currently uses a mix of max-line-length and relying on editor auto-wrap
  // spaces: undefined, // covered by "atx", "atx_closed", "headers"
  // spelling: undefined, // mongoose currently only uses short-form language specifiers and so does not need this
  // ul: undefined, // covered by "whitespace" and "bullet"
  // url: undefined, // covered by "links"
};
