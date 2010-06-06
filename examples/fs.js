var BSON = require('../lib/support/node-mongodb-native/lib/mongodb/bson/bson').BSON,
    sys = require('sys'),
    path = require('path'),
    fs = require('fs'),
    mongoose = require('../mongoose').Mongoose, // get Mongoose
    db = mongoose.connect('mongodb://localhost/test'); // connect to localhost, test db


mongoose.load(__dirname+'/models/file.js'); // load model

File = mongoose.get('File',db); // user model 'File'

recursiveFolderScan = function(dir,file){
  var resource = (file) ? path.join(dir,file) : dir;

  var stats = fs.statSync(resource), obj = { dir : dir, file : file };
  for(i in stats) if(typeof stats[i] != 'function') obj[i] = stats[i];

  new File(obj).save(); // save modified stats object

  if(stats.isDirectory()){
    fs.readdirSync(resource).forEach(function(path){
      recursiveFolderScan(resource,path);
    });
  }
};

File.drop(function(){ // resetting data for example
  
  recursiveFolderScan(path.join(process.ENV.PWD)); // process 'examples' directory

  File.modifiedInLastWeek().each(function(doc){
    // using custom getters
    sys.puts('\nModified this Week:\t\n\t'+doc.filePath +'\n\tsize: '+doc.sizeInKB+'\n\tmod time: '+doc.ISODateString(doc.mtime));
    
  },true).then(function(){
    File.close();
  });
  
});