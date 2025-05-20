'use strict';

const fs = require('fs');
const uppercaseRE = /[A-Z]/g;

const checkFolder = (folder) => {
  const folderContent = fs.readdirSync(folder);

  for (const entry of folderContent) {

    if (fs.lstatSync(folder + '/' + entry).isDirectory()) {
      checkFolder(folder + '/' + entry);
    } else {
      if (entry === '.gitignore' || entry.endsWith('.d.ts')) {
        if (uppercaseRE.test(entry)) {
          console.error('File ' + entry + ' contains uppercase characters.\n');
          process.exit(1);
        }
        continue;
      } else {
        console.error('File ' + entry + ' does not have a valid extension, must be .d.ts or .gitignore.\n');
        process.exit(1);
      }
    }
  }
};

checkFolder('./types');
