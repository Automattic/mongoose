
var sys = require('sys'),
    mongoose = require('./'),
    document = mongoose.define,
    tests = [],
    startTime,
    start = function(currentLabel){
      startTime = new Date;
      sys.print('  - \x1b[33m' + currentLabel + '\x1b[0m: ');
      
    },
    
    stop = function(){
      var stopTime = new Date,
              duration = stopTime - startTime;
          sys.print(duration + ' ms\n');
    },
    
     permute = function(struct, callback, stack){
      var stack = stack || [], substack,
          num = struct[0], max = struct[1], step = struct[2], sub = struct[3];      
      for(;num <= max; num += step){
        callback(substack = stack.concat(num));
        if(num && Array.isArray) permute(sub,callback, substack);
      }
    },
    
    build_test: function(stack, num){
      if(num)
      
    },
    
    run_test: function(num){
      
      
    };
    
    
permute([0,15,5,
  [0,10,5,
    [0,5,5,
      [0,5,5,
        [0,1,3]
      ]
    ]
  ]
], function(stack){
  
  built_test(stack, ++testIdx);

    build_test(stack, ++model);
    run_test(model);
    
    var model = document('m'+model++),
        props = stack.shift(),
        context = model;
    for(var i=0,l=root; i<l; i++){
      m.string('prop_'+i);
    }
    while(stack.length){
      var obj = stack.shift();
      var doc = document();
      content.object('obj', doc);
      for(var i=0,l=root; i<l; i++) doc.string('prop_'+i);
      context = doc;
    }


  
});


mongoose.connect('mongodb://localhost/benchmark', function(){
  var model = 0;

  start('---- 1.0 hydrate instances 100,000 series (hard flat) ---- '+ (x+1));
  
  stop();

  mongoose.disconnect();
});
    
/*
    document('User')
      .object('name',
        document()
          .string('first')
          .string('last'))
      .object('contact',
        document()
          .string('email')
          .string('phone')
          .string('city'))
      .number('age');
*/
/*
    document('User')
      .oid('_id')
      .string('culture')
      .object('name', 
        document()
          .string('prefix')
          .string('first') //.set(function(v){ return v ? v : ''; })
          .string('middle') //.set(function(v){ return v ? v : ''; })
          .string('last')) //.set(function(v){ return v ? v : ''; })
 //         .virtual('fullname')
  //          .get(function(){
  //            return ((this.name.prefix || '') + ' ' + (this.name.first || '') + ' ' 
  //                  + (this.name.middle || '') + ' ' + (this.name.last || '')).replace(/\s+/g, ' ');
  //          })
  //        .virtual('middleInitials')
  //          .set(function(){
  //            return this.middle ? this.middle.split(' ').map(function(a){
  //              return a.charAt(0);
  //            }).join(' ') : '';             
  //          })
      .object('account',
        document()
          .string('username')
          .string('salt')
          .string('password')
          .oid('added_by')
          .date('created_at')
          .string('role')
          .string('trada'))
 //         .virtual('password_plain')
//            .set(function(pwd){
//              if (!this.account.salt) this.account.salt = salt();
//              this.account.password = (this.account.salt + pwd);
//            }))
      .object('location',
        document()
          .string('street')
          .string('city')
          .string('state')
          .string('zip')
          .string('country')
          .string('timezone'))
      .object('contact',
        document()
          .string('phone')
          .string('email')
          .string('twitter')
          .string('facebook'))
      .object('bio',
        document()
          .string('text')
          .string('birth_date'))
//      .array('notes');
*/

    document('User')
      .oid('_id')
 //     .string('culture')
//          .string('prefix')
          .string('first') //.set(function(v){ return v ? v : ''; })
//          .string('middle') //.set(function(v){ return v ? v : ''; })
          .string('last') //.set(function(v){ return v ? v : ''; })
//          .string('username')
//          .string('salt')
//          .string('password')
//          .date('created_at')
//          .string('role')
//          .string('trada')
//          .string('street')
//          .string('city')
//          .string('state')
//          .string('zip')
//          .string('country')
//          .string('timezone')
//          .string('phone')
//          .string('email')
//          .string('twitter')
//          .string('facebook')
//          .string('text')
          .string('birth_date');

  


mongoose.connect('mongodb://localhost/benchmark', function(){
  d = new Date();
  bday = new Date('06/17/1977');
  var User = mongoose.User;
  for(x=0,y=1; x<y; x++){
    start('---- 1.0 hydrate instances 100,000 series (hard flat) ---- '+ (x+1));
    for(i=0,l=1; i<l; i++){

            var u = new User({
  //            culture: 'usa',
  //              prefix: 'Mr.',
                first: 'Nathan',
  //              middle: 'Thomas',
                last: 'White',
  //              username: 'nathan.white',
  //              salt: 'dumb',
  //              password: '12CDEA5EEA0892C62F13E24B123B21753D7E13B',
  //              created_at: d,
      //          loggedin: [],
  //              role: 'teacher',
  //              street: '1461 15th St.',
  //              city: 'San Francisco',
  //              state: 'CA',
  //              zip: 94103,
  //              country: 'usa',
  //              timezone: '-7',
  //              phone: '415-608-0536',
  //              email: 'nw@nwhite.net',
  //              twitter: '_nw_',
  //              facebook: 'nathan.white',
  //              text: 'random crap here',
                birth_date: bday
      //        , notes: ['note 1', 'note 2', 'note n'] 
            }, true);
            
    //        console.log(u._schema._struct);

   /*
      var u = new User({
        culture: 'usa',
        name: {
          prefix: 'Mr.',
          first: 'Nathan',
          middle: 'Thomas',
          last: 'White'
        },
        account: {
          username: 'nathan.white',
          salt: 'dumb',
          password: '12CDEA5EEA0892C62F13E24B123B21753D7E13B',
          created_at: d,
//          loggedin: [],
          role: 'teacher'
        },
        location: {
          street: '1461 15th St.',
          city: 'San Francisco',
          state: 'CA',
          zip: 94103,
          country: 'usa',
          timezone: '-7'
        },
        contact: {
          phone: '415-608-0536',
          email: 'nw@nwhite.net',
          twitter: '_nw_',
          facebook: 'nathan.white'
        },
        bio: {
          text: 'random crap here',
          birth_date: bday
        }
//        , notes: ['note 1', 'note 2', 'note n'] 
      });
    */
      
      
 //    var u = new User({
  //      name: {first: 'Nathan', last: 'White'},
  //      contact: {email: 'nw@nwhite.net', phone: '555-555-5555', city: 'SF'},
  //      age: 33
  //    }, true);
    }
    stop();
  }
  mongoose.disconnect();
  
  start('concat measure');
  var obj = {test: {}}
    for(var i=0,l=100000;i<l;i++){
      if(obj.hasOwnProperty('test') && !Array.isArray(obj['test']) && typeof obj['test'] == 'object'){
        
      }
    }
  stop();
  
});