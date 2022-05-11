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
        console.error('File ' + entry + ' is not having a valid file-extension.\n');
        process.exit(1);
      }
    }
  }
};

checkFolder('./types');
