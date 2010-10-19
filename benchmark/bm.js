var sys = require('sys'),
    mongoose = require('../'),
    document = mongoose.define,
    BM = function(){};

BM.prototype = {
  
  runs: 3,
  times: 25000,
  tests: [],
  schemas: 0,
  startTime: null,
  
  start: function(currentLabel){
    this.startTime = new Date;
    sys.print('  - \x1b[33m' + currentLabel + '\x1b[0m: ');
  },
  
  stop: function(){
    this.stopTime = new Date;
    var duration = this.stopTime - this.startTime,
        avg = Math.ceil(duration/this.runs),
        opms = Math.floor((this.times / avg) * 100) / 100;
    sys.print(duration + ' ms   avg: '+ avg + ' ms   '+ opms +' ops/ms\n');    
  },
  
   permute: function(struct, callback, stack){
    var stack = stack || [], substack,
        num = struct[0], max = struct[1], step = struct[2], sub = struct[3];      
    for(;num <= max; num += step){
      callback(substack = stack.concat(num));
      if(num && Array.isArray(sub)) this.permute(sub,callback, substack);
    }
  },
  
  _makeTest: function(struct, model, object, hydrate){
    var self = this,
        num = this.tests.length + 1,
        name = num + ((hydrate) ? ': (H) - ' : ': (I) - ') + struct.toString(),
        len = struct.toString().length;
        if(len < 2) name += '\t'; 
        if(len < 10) name += '\t';
        name += '\t';

    this.tests.push(function(model, object, hydrate){
        var runs = self.runs, times = self.times, r, t,
            model = model, object = object, hydrate = hydrate;   
        this.start(name);
        for(r=0; r<runs; r++){
          for(t=0; t<times; t++){
            new model(object, hydrate);
          }
        }
        this.stop();
        this.run();
    }.bind(this, model, object, hydrate));
  },
  
  _makeSchema: function(stack, model){
    var obj = {}, stack = stack, props = stack.shift(), context, id, model;
    if(typeof model == 'number'){
      id = model;
      model = document('M'+model);
    }
    for(var i=0; i<props; i++){
      model.string('prop_'+i);
      obj['prop_'+i] = 'prop_'+i;
    }
    if(stack.length){
      context = document();
      obj['nest'] = this._makeSchema(stack.concat(), context);
      model.object('nest', context);
    }
    return obj;
  },
  
  build: function(struct){
    var self = this;
    this.permute(struct, function(stack){
      var id = self.schemas++,
          obj = self._makeSchema(stack.concat(), id);
          model = mongoose.connection.model('M'+id);
      self._makeTest(stack, model, obj, true);
      self._makeTest(stack, model, obj, false);
    });
  },
  
  run: function(){
    if(!this.tests.length) return;
    (this.tests.shift())();
  }
  
}

bm = new BM();

mongoose.connect('mongodb://localhost/benchmark', function(){

  bm.build(
    [0,15,3,
      [0,10,5,
        [0,5,5,
          [0,5,5,
            [0,1,3]
          ]
        ]
      ]
  ]);
  
  bm.run();
  mongoose.disconnect();
});
