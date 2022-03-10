const fs = require('fs');

const readFolder = (folder) => {
    const folderContent = fs.readdirSync(folder);

    for (const entry of folderContent) {

        if (fs.lstatSync(folder + "/" + entry).isDirectory()) {
            readFolder(folder + "/" + entry);
        } else {
            if (entry === '.gitignore' || entry.endsWith('.d.ts')) {
                continue;
            } else {
                throw new Error('File ' + entry + ' is not valid');
            }
        }
    }
};

readFolder('./types')