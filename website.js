
var fs = require('fs')
  , template = fs.readFileSync('template.html').toString()
  , markdown = require('markdown');

function process (input, output) {
  fs.writeFileSync(
      output
    , template.replace('<!-- CONTENT -->', 
        markdown.parse(fs.readFileSync(input).toString())
      )
  );
};

process('README.md', 'index.html');
process('docs/defaults.md', 'docs/defaults.html');
process('docs/embedded-documents.md', 'docs/embedded-documents.html');
process('docs/finding-documents.md', 'docs/finding-documents.html');
process('docs/indexes.md', 'docs/indexes.html');
process('docs/middleware.md', 'docs/middleware.html');
process('docs/model-definition.md', 'docs/model-definition.html');
process('docs/validation.md', 'docs/validation.html');
process('docs/virtuals.md', 'docs/virtuals.html');
process('docs/getters-setters.md', 'docs/getters-setters.html');
