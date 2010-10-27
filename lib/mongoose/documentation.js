var fs =require('fs');
var md = require("../../support/node-markdown/lib/markdown").Markdown;

var types = {};

function formatFn(fn, offset){
  var lines = fn.toString().split(/[\n\r]+/),
      pos = 0,
      txt = '',
      spacer = '';
      
  while(spacer.length < offset) spacer += ' ';
  while(/\s/.test(lines[lines.length-1].charAt(pos))) pos++;
  for(var i=0, l = lines.length; i<l; i++){
    txt += spacer;
    txt += (i) ? lines[i].substr(pos) : lines[i];
    txt += '\n';
  }
  return txt;
}

function getDetails(name, prop, depth){
  var markdown = '', spacer = '', offset = '';
  // spacing offsets for nested properties
  while(offset.length < depth * 2) offset += '  ';
  spacer += "  " + offset;
  
  markdown += offset + '* <h3>'+ name + '</h3>  ';
  markdown += '*Type:* <a href="#Type_'+ prop.type + '">'+ prop.type+'</a> *Extends:* '+
        ((prop.parent) ? '<a href="#Type_'+prop.parent+'">'+prop.parent+'</a>' : 'none') + '\n\n';
  prop._doc.forEach(function(d){ // pull in user docs
    markdown += spacer + d + '\n\n';
  });
  
  types[prop.type] = true;
  if(prop.parent) types[prop.parent] = true;
  
  // details
  markdown += spacer + '<span class="details">\n';
  markdown += spacer + '  **Required:** '+ ((prop._required) ? 'true' : 'false') + '\n\n'; // required
  markdown += spacer + '  **Strict:** '+ ((prop._strict) ? 'true' : 'false') + '\n\n'; // required
  markdown += spacer + '  **Default:** '+ ((prop._default) ? 'true' : 'false') + '\n\n'; // default
  if(prop._default){
    markdown += formatFn(prop._default, 6 + depth*2);
  }
  // getters
  markdown += spacer + '  **Getters:** '+ ((prop.getters.length || prop._castGet) ? '' : 'none') + '\n\n';
  if(prop.getters.length || prop._castGet){
    prop.getters.forEach(function(fn){
      markdown += formatFn(fn, 6 + depth*2);
    });
    if(prop._castGet) markdown += formatFn(prop._castGet, 6 + depth*2);
  }
  // setters
  markdown += spacer + '  **Setters:** '+ ((prop.setters.length || prop._castSet) ? '' : 'none') + '\n\n';
  if(prop.setters.length || prop._castSet){
    if(prop._castSet) markdown += formatFn(prop._castSet, 6 + depth*2);
    prop.setters.forEach(function(fn){
      markdown += formatFn(fn, 6 + depth*2);
    });
  }
  // validators
  markdown += spacer + '  **Validators:** ' + (Object.keys(prop.validators).length ? '' : 'none') + '\n\n';
  for(validator in prop.validators){
    markdown += formatFn(prop.validators[validator], 6 + depth*2);
  }
  
  markdown += spacer + '</span>\n';
  return markdown;
};

function walk(struct, schema, path){
  var p = path || [], i, l, prop, curpath, markdown = '';
  for(i=0,l=struct.length; i<l; i++){
    prop = struct[i];
    if(typeof prop == 'string'){
      curpath =  p.concat(prop).join('.');
      if(schema.paths[curpath].options && schema.paths[curpath].options.paths){
        markdown += getDetails(prop, schema.paths[curpath], p.length);
        markdown += walk(schema.paths[curpath].options._struct, schema.paths[curpath].options, []);
      } else {
       markdown += getDetails(prop, schema.paths[curpath], p.length); 
      }
    } else {
      prop = struct[i][0];
      curpath =  p.concat(prop).join('.');
      markdown += getDetails(prop, schema.paths[curpath], p.length);      
      markdown += walk(struct[i][1], schema, p.concat(prop));
    }
  }
  return markdown;
};

module.exports.create = function(model, path, callback){
 
 var markdown = '# '+ model._name + ' Model <span>collection: '+ model._collection + '</span>\n\n';
 
 model._description.forEach(function(d){
   markdown += d + '\n\n';
 });
 
 markdown += '\n\n# Schema\n\n';
 
 markdown += walk(model._struct, model, []);
 
 markdown += '\n\n# Types\n\n';
 for(i in types){
   markdown += '* '+i+'\n\n';
 }
 
 markdown += '\n\n# Statics\n\n';
 
 for(i in model._statics){
   markdown += '* '+i+'\n\n';
   markdown += formatFn(model._statics[i], 6);
 }
 
 markdown += '\n\n# Hooks\n\n';
 
 for(i in model._hooks){
   markdown += '* '+i+'\n\n';
   markdown += formatFn(model._hooks[i], 6);
 }
 
 markdown += '\n\n# Methods\n\n';
 
 for(i in model._methods){
   markdown += '* '+i+'\n\n';
   markdown += formatFn(model._methods[i], 6);
 }
 
// markdown += '\n\n# Plugins\n\n';

var fs =require('fs');
var md = require("../../support/node-markdown/lib/markdown").Markdown;


  fs.writeFile(path+'/'+ model._name + '.md', markdown,  function (err) {
    if (err){
      if(callback) return callback(err);
      else throw err;
    }
    fs.writeFile(path+'/'+ model._name + '.html', md(markdown), function(err){
      if (err){
        if(callback) return callback(err);
        else throw err;
      }
      if(callback) callback(null);
    });
    
  });

}