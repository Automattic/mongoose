var fs =require('fs');
var md = require("../../support/node-markdown/lib/markdown").Markdown;

var types = {};

formatFn = function(fn, offset){
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

getDetails = function(name, prop, depth){
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
  // details
  markdown += spacer + '<span class="details">\n';
  markdown += spacer + '  **Required:** '+ ((prop._required) ? 'true' : 'false') + '\n\n'; // required
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

walk = function(struct, schema, path){
  var p = path || [], i, l, prop, curpath, markdown = '';
  for(i=0,l=struct.length; i<l; i++){
    prop = struct[i];
    if(typeof prop == 'string'){
      curpath =  p.concat(prop).join('.');
      if(schema.paths[curpath].options && schema.paths[curpath].options.paths){
        markdown += getDetails(prop, schema.paths[curpath], p.length);
    //    console.log(schema.paths[curpath].options);
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

module.exports.create = function(model, path){
 
 var markdown = '# '+ model._name + ' Model <span>collection: '+ model._collection + '</span>\n\n';
 
 model._description.forEach(function(d){
   markdown += d + '\n\n';
 });
 
 markdown += '\n\n# Schema\n\n';
 
 markdown += walk(model._struct, model, []);
 
 markdown += '\n\n# Types\n\n';
 
 markdown += '\n\n# Statics\n\n';
 
 markdown += '\n\n# Hooks\n\n';
 
 markdown += '\n\n# Methods\n\n';
 
 markdown += '\n\n# Plugins\n\n';

var fs =require('fs');
var md = require("../../support/node-markdown/lib/markdown").Markdown;
var html = '<html>';
html += '<head>' +
'<script type="text/javascript" src="http://code.jquery.com/jquery-1.4.2.min.js"></script>' +
'<script type="text/javascript">' +
'var active = null;' +
'$("li h3").live("click", function(evt){' +
'  var current  = $(this).parent().siblings(".details")[0];' +
'  if(active){' +
'    $(active).css("display", "none");' +
'    if(active == current){' +
'      active = null;' +
'    } else {' +
'      $(current).css("display", "block");' +
'      active = current;' +
'    }' +
'  } else {' +
'    $(current).css("display", "block");' +
'    active = current;' +
'  }' +
'});' +
'</script>' +
'<style type="text/css">' +

'body {' +
'  margin: 0;' +
'  padding: 0;' +
'  background: #e3e3e3;' +
'}' +

'#container {' +
'  width: 1000px;' +
'  border: 1px solid #888;' +
'  background: #fff;' +
'  padding: 20px;' +
'  margin: 30px auto;' +
'}' +

'h1, h2 {' +
'  border-bottom: 1px solid #888;' +
'}' +

'h1 span {' +
'  float: right;' +
'  font-size: 18px;' +
'  padding-top: 10px;' +
'}' +

'li {' +
'  list-style: disc;' +
'  padding: 4px;' +
'  margin-top: 2px;' +
'  margin-bottom: 2px;' +
'}' +

'li a {' +
'  font-size: 14px;' +
'  color: #59727c;' +
'}' +

'li h3 {' +
'  font-size: 18px;' +
'  color: #402e18;' +
'  background: #fafad5;' +
'  padding: 1px 3px;' +
'  border: 1px dashed #c8baaa;' +
'  cursor: pointer;' +
'}' +

'h3 span:hover {' +
'  background: #402e18;' +
'  color: #fafad5;' +
'  border-style: solid;' +
'}' +

'li > p {' +
'  padding: 0;' +
'  margin: 4;' +
'  font-size: 12px;' +
'  color: #555;' +
'}' +

'li .details {' +
'  display: none;' +
'  padding: 8px;' +
'  border: 1px dashed #ddd;' +
'  font-size: 14px;' +
'}' +

'li .details li {' +
'  list-style: none;' +
'}' +

'li .details pre {' +
'  border: 1px dashed #ccc;' +
'  margin-right: 20px;' +
'  padding: 10px;' +
'  background: #fafad5;' +
'}' +
'</style>' +
'</head>' +
'<body>' +
'<div id="container">';
html += md(markdown);
html += '</div></body></html>';

  fs.writeFile(path+'/'+ model._name + '.md', markdown,  function (err) {
    if (err) throw err;
  });

  fs.writeFile(path+'/'+ model._name + '.html', html, function(err){
    if (err) throw err;
  });





}