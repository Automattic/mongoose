
Model.define('File', {
  
  collection : 'fs',
  
  types: {
    dir : String,
    file : String,
    dev : Number,
    ino : Number,
    mode : Number,
    nlink : Number,
    uid : Number,
    gid : Number,
    rdev: Number,
    size: Number,
    blksize: Number,
    blocks: Number,
    atime: Date,
    mtime: Date,
    ctime: Date
  },
  
  indexes : ['dir','file','size','ctime','mtime'],
  
  static : {
    
    modifiedInLastWeek : function(){
      return this.find().gt({mtime : (Date.now() - 604800000)+'' });
    }
    
  },
  
  methods : {
    ISODateString : function(ts){
     var d = new Date(parseInt(ts));
     function pad(n){return n<10 ? '0'+n : n}
     return d.getUTCFullYear()+'-'
          + pad(d.getUTCMonth()+1)+'-'
          + pad(d.getUTCDate())+'T'
          + pad(d.getUTCHours())+':'
          + pad(d.getUTCMinutes())+':'
          + pad(d.getUTCSeconds())+'Z'
    }
  },
  
  setters: {
    atime : function(date){
      if(!date) return;
      if(Object.prototype.toString.call(date) == '[object Date]') return date.getTime()+'';
      else return date;    
    },
    mtime : function(date){
      if(!date) return;
      if(Object.prototype.toString.call(date) == '[object Date]') return date.getTime()+'';
      else return date;        
    },
    ctime : function(date){
      if(!date) return;
      if(Object.prototype.toString.call(date) == '[object Date]') return date.getTime()+'';
      else return date;    
    }
   
  },
  
  getters: {
    sizeInKB : function(v){ return (this.size/1024).toFixed(2) + ' kb'; },
    filePath : function(){ return require('path').join(this.dir,this.file); }
  }
  
});