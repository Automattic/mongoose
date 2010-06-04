
describe 'Document'
  before_each
  end
 
  describe 'Simple'
  
    it 'should return object in non strict mode'
      var doc = new Document(
                {name: 'test', data: 'test'}, // data
                ['name','data'], //schema
                {}, // getters
                {}, // setters
                false // strict
              );
      doc.__doc.name.should.equal 'test'
      doc.name.should.equal 'test'
      doc.__doc.data.should.equal 'test'
      doc.data = 'replace'
      doc.__doc.data.should.equal 'replace'    
    end
    
    it 'should return object w/ strict'
      var doc = new Document(
                {name: 'test', data: 'test'}, // data
                ['name','data'], //schema
                {}, // getters
                {}, // setters
                true // strict
              );
      doc.__doc.name.should.equal 'test'
      doc.name.should.equal 'test'
      doc.__doc.data.should.equal 'test'
      doc.data = 'replace'
      doc.__doc.data.should.equal 'replace'
    end
    
    it 'passing extra key/val not in schema in non strict mode'
      var doc = new Document(
                {name: 'test', data: 'test', test2: 'hmm'}, // data
                ['name','data'], //schema
                {}, // getters
                {}, // setters
                false // strict
              );
      doc.__doc.name.should.equal 'test'
      doc.name.should.equal 'test'
      doc.__doc.data.should.equal 'test'
      doc.data = 'replace'
      doc.__doc.data.should.equal 'replace'
      doc.__doc.test2.should.equal 'hmm'
      doc.test2 = 'change me';
      doc.__doc.test2.should.equal 'change me'
      
    end   
    
    it 'passing extra key/val not in schema in strict mode'
      var doc = new Document(
                {name: 'test', data: 'test', test2: 'hmm'}, // data
                ['name','data'], //schema
                {}, // getters
                {}, // setters
                true // strict
              );
      doc.__doc.name.should.equal 'test'
      doc.name.should.equal 'test'
      doc.__doc.data.should.equal 'test'
      doc.data = 'replace'
      doc.__doc.data.should.equal 'replace'
      doc.__doc.test2.should.be_undefined
      doc.test2 = 'change me';
      doc.__doc.test2.should.be_undefined
      
    end    
  end

  describe 'Simple Array'
    it 'should return an object w/ working array in non strict'
      var doc = new Document(
        {name: 'test', test : [1,2,3]},
        ['name',{'test': []}],
        {},
        {},
        false
      );
      
      doc.test[0].should.equal 1
      doc.__doc.test[0].should.equal 1
      doc.test.push(4);
      doc.test.length.should.equal 4
      doc.__doc.test.length.should.equal 4
      doc.__doc.test[3].should.equal 4
    end
    
    it 'should return an object w/ working array in strict'
      var doc = new Document(
        {name: 'test', test : [1,2,3]},
        ['name',{'test': []}],
        {},
        {},
        true
      );
      
      doc.test[0].should.equal 1
      doc.__doc.test[0].should.equal 1
      doc.test.push(4);
      doc.test.length.should.equal 4
      doc.__doc.test.length.should.equal 4
      doc.__doc.test[3].should.equal 4
    end
    
    it 'should return an object w/ working array not defined in schema (non strict)'
      var doc = new Document(
        {name: 'test', test : [1,2,3]},
        [],
        {},
        {},
        false
      );
    
      doc.test[0].should.equal 1
      doc.__doc.test[0].should.equal 1
      doc.test.push(4);
      doc.test.length.should.equal 4
      doc.__doc.test.length.should.equal 4
      doc.__doc.test[3].should.equal 4    
    end
    
  end
  
  describe 'With Getters'
  
    it 'should return object no strict'
      var doc = new Document(
        {name : 'test', data: 'test'},
        ['name','data'],
        { full : function(){ return this.name + ' ' + this.data; }  },
        {},
        false
        );
      
      doc.data = 'me';
      doc.full.should.equal 'test me'
      doc.__doc.data.should.equal 'me'
    end  
  
    it 'should return object w/ strict'
      var doc = new Document(
        {name : 'test', data: 'test'},
        ['name','data'],
        { full : function(){ return this.name + ' ' + this.data; }  },
        {},
        true
        );
        
      doc.data = 'me';
      doc.full.should.equal 'test me'
      doc.__doc.data.should.equal 'me'
    end
  end
   
  describe 'With Setters'
    it 'should return object in non strict mode'
      var doc = new Document(
        {name: 'test', data: 'test'},
        ['name','data'],
        {},
        { data : function(val){ return val.toUpperCase(); }},
        false
      );
    
      doc.data.should.equal 'TEST'
      doc.__doc.data.should.equal 'TEST'
      doc.data = 'me'
      doc.__doc.data.should.equal 'ME'
    
    end  

    it 'should return object in strict mode'
      var doc = new Document(
        {name: 'test', data: 'test'},
        ['name','data'],
        {},
        { data : function(val){ return val.toUpperCase(); }},
        true
      );
      
      doc.data.should.equal 'TEST'
      doc.__doc.data.should.equal 'TEST'
      doc.data = 'me'
      doc.__doc.data.should.equal 'ME'
      
    end
  end
  
  describe 'Embedded Object'
  
    it 'should return object non strict'
      var doc = new Document(
        {name: 'test', test: {phone: '555-555-5555'}},
        ['name',{'test':['phone']}],
        {},
        {},
        false
      );
      doc.name = 'self'
      doc.__doc.name.should.equal 'self'
      doc.__doc.test.phone.should.equal '555-555-5555'
      doc.test.phone = '777-777-7777'
      doc.__doc.test.phone.should.equal '777-777-7777'
    end
    it 'should return object w/ strict'
      var doc = new Document(
        {name: 'test', test: {phone: '555-555-5555'}},
        ['name',{'test':['phone']}],
        {},
        {},
        true
      );
      doc.name = 'self'
      doc.__doc.name.should.equal 'self'
      doc.__doc.test.phone.should.equal '555-555-5555'
      doc.test.phone = '777-777-7777'
      doc.__doc.test.phone.should.equal '777-777-7777'
    end

    it 'should return object w/ getter & non strict'
      var doc = new Document(
        {name: 'test', test: {phone: '555-555-5555'}},
        ['name',{'test':['phone']}],
        { test : { phone: function(val){ return '+1 '+val; }  }},
        {},
        false
      );
    
      doc.test.phone.should.equal '+1 555-555-5555'
      doc.__doc.test.phone.should.equal '555-555-5555'
      
    end

    it 'should return object w/ getter & strict'
      var doc = new Document(
        {name: 'test', test: {phone: '555-555-5555'}},
        ['name',{'test':['phone']}],
        { test : { phone: function(val){ return '+1 '+val; }  }},
        {},
        true
      );
    
      doc.test.phone.should.equal '+1 555-555-5555'
      doc.__doc.test.phone.should.equal '555-555-5555'
    end
    
    it 'should return object w/ setter & non strict'
      var doc = new Document(
        {name: 'test', test: { data : 'test'}},
        ['name',{'test':['data']}],
        {},
        {test: { data : function(val){ return val.toUpperCase(); } }},
        false
      );
      
      doc.test.data = 'me';
      doc.test.data.should.equal 'ME'
      doc.__doc.test.data.should.equal 'ME'
    end
    
    it 'should handled embedded within embedded objects (non strict)'
      var doc = new Document(
        {prop1: 'test1', prop2: { prop3 : 'test3', prop4 : { prop5 : 'test5'}}},
        ['prop1',{'prop2':['prop3',{'prop4' : ['prop5']} ]} ],
        {},
        {},
        false
      );   
      doc.prop2.prop4.prop5.should.equal 'test5'
      doc.__doc.prop2.prop4.prop5.should.equal 'test5'
      doc.prop2.prop4.prop5 = 'me';
      doc.prop2.prop4.prop5.should.equal 'me'
      doc.__doc.prop2.prop4.prop5.should.equal 'me'
    end
  
    it 'should handled embedded within embedded objects (strict)'
      var doc = new Document(
        {prop1: 'test1', prop2: { prop3 : 'test3', prop4 : { prop5 : 'test5'}}},
        ['prop1',{'prop2':['prop3',{'prop4' : ['prop5']} ]} ],
        {},
        {},
        false
      );   
      doc.prop2.prop4.prop5.should.equal 'test5'
      doc.__doc.prop2.prop4.prop5.should.equal 'test5'
      doc.prop2.prop4.prop5 = 'me';
      doc.prop2.prop4.prop5.should.equal 'me'
      doc.__doc.prop2.prop4.prop5.should.equal 'me'
    end  
    
    
    it 'should handle embedded in embedded with array (non strict)'
      var doc = new Document(
        {prop1: 'test1', prop2: [1,2,3], prop3: { prop4 : 'test3', prop5 : { prop6 : 'test5', prop7 : [1,2,3] }}},
        ['prop1', {'prop2': [], 'prop3' : ['prop4', {'prop5' : ['prop6', {'prop7' : [] } ]} ]} ],
        {},
        {},
        false
      );

      doc.prop3.prop5.prop7.length.should.equal 3
      doc.__doc.prop3.prop5.prop7.length.should.equal 3
      doc.prop3.prop5.prop7.push(4);
      doc.prop3.prop5.prop7.length.should.equal 4
      doc.__doc.prop3.prop5.prop7.length.should.equal 4
      doc.prop3.prop5.prop7.pop();
      doc.prop3.prop5.prop7.length.should.equal 3
      doc.__doc.prop3.prop5.prop7.length.should.equal 3  
         
    end
    
    it 'should handle embedded in embedded with array (strict)'
      var doc = new Document(
        {prop1: 'test1', prop2: [1,2,3], prop3: { prop4 : 'test3', prop5 : { prop6 : 'test5', prop7 : [1,2,3] }}},
        ['prop1', {'prop2': [], 'prop3' : ['prop4', {'prop5' : ['prop6', {'prop7' : [] } ]} ]} ],
        {},
        {},
        true
      );

      doc.prop3.prop5.prop7.length.should.equal 3
      doc.__doc.prop3.prop5.prop7.length.should.equal 3
      doc.prop3.prop5.prop7.push(4);
      doc.prop3.prop5.prop7.length.should.equal 4
      doc.__doc.prop3.prop5.prop7.length.should.equal 4
      doc.prop3.prop5.prop7.pop();
      doc.prop3.prop5.prop7.length.should.equal 3
      doc.__doc.prop3.prop5.prop7.length.should.equal 3  
         
    end    
     
  end
  
  describe 'Array of Embedded Object'
    
    it 'should handle array of defined objects (non strict)'
      var doc = new Document(
        {'test' : 'me', arr : [{field1: 'one', field2: 'two'},{field1: 'one1', field2: 'two2'}]},
        ['test',{'arr' : [['field1', 'field2']] }],
        {},
        {},
        false
      );
      
      doc.arr.length.should.equal 2
      doc.__doc.arr.length.should.equal 2
      doc.arr.push({field1: 'one3', field2: 'two3'})
      doc.arr.length.should.equal 3
      doc.__doc.arr.length.should.equal 3
      doc.arr[1].remove();
      doc.arr.length.should.equal 2
      doc.__doc.arr.length.should.equal 2
      doc.arr[1].__idx.should.equal 1
      doc.arr[1].field1.should.equal 'one3'      
    end

    it 'should handle array of defined objects (strict)'
      var doc = new Document(
        {'test' : 'me', arr : [{field1: 'one', field2: 'two'},{field1: 'one1', field2: 'two2'}]},
        ['test',{'arr' : [['field1', 'field2']] }],
        {},
        {},
        false
      );
      
      doc.arr.length.should.equal 2
      doc.__doc.arr.length.should.equal 2
      doc.arr.push({field1: 'one3', field2: 'two3'})
      doc.arr.length.should.equal 3
      doc.__doc.arr.length.should.equal 3
      doc.arr[1].remove();
      doc.arr.length.should.equal 2
      doc.__doc.arr.length.should.equal 2
      doc.arr[1].__idx.should.equal 1
      doc.arr[1].field1.should.equal 'one3'      
    end
    
    it 'should handle array of defined objects w/ getters (non strict)'
      var doc = new Document(
        {arr: [{first: 'Nathan', last: 'White'},{first: 'Scott', last: 'Black'}]},
        [{'arr': [['first','last']]}],
        {arr:{name: function(){ return this.first+' '+this.last; }, last: function(val){ return val.toUpperCase(); } } },
        {},
        false
      );
      
      doc.arr[0].name.should.equal 'Nathan WHITE'
      doc.__doc.arr[0].last.should.equal 'White'
      
      doc.arr[1].name.should.equal 'Scott BLACK'
      doc.__doc.arr[1].name.should.be_undefined
      
    end    

    it 'should handle array of defined objects w/ getters (strict)'
      var doc = new Document(
        {arr: [{first: 'Nathan', last: 'White'},{first: 'Scott', last: 'Black'}]},
        [{'arr': [['first','last']]}],
        {arr:{name: function(){ return this.first+' '+this.last; }, last: function(val){ return val.toUpperCase(); } } },
        {},
        true
      );
      
      doc.arr[0].name.should.equal 'Nathan WHITE'
      doc.__doc.arr[0].last.should.equal 'White'
      
      doc.arr.length.should.equal 2
      doc.__doc.arr.length.should.equal 2
      
      doc.arr[1].name.should.equal 'Scott BLACK'
      doc.__doc.arr[1].name.should.be_undefined
       
    end

    it 'should handle array of defined objects w/ setter (non strict)'
      var doc = new Document(
        {arr: [{first: 'Nathan', last: 'White'}]},
        [{'arr': [['first','last']]}],
        {},
        {arr:{last: function(val){ return val.toUpperCase(); } } },
        false
      );
      
      doc.arr[0].last.should.equal 'WHITE'
      doc.__doc.arr[0].last.should.equal 'WHITE' 
      doc.arr[0].last = 'test';
      doc.arr[0].last.should.equal 'TEST'
      doc.__doc.arr[0].last.should.equal 'TEST'
      
      doc.arr.push({first: 'Fun', last: 'Times'});
      doc.arr.length.should.equal 2
      doc.__doc.arr.length.should.equal 2
      
      doc.arr[1].first.should.equal 'Fun'
      doc.arr[1].last.should.equal 'TIMES'
      doc.__doc.arr[1].first.should.equal 'Fun'
      doc.__doc.arr[1].last.should.equal 'TIMES'
      
      doc.arr[1].last = 'Smith';
      doc.arr[1].last.should.equal 'SMITH'
      doc.__doc.arr[1].last.should.equal 'SMITH'
      
    end

    it 'should handle array of defined objects w/ setter (strict)'
      var doc = new Document(
        {arr: [{first: 'Nathan', last: 'White'}]},
        [{'arr': [['first','last']]}],
        {},
        {arr:{last: function(val){ return val.toUpperCase(); } } },
        true
      );
      
      doc.arr[0].last.should.equal 'WHITE'
      doc.__doc.arr[0].last.should.equal 'WHITE' 
      doc.arr[0].last = 'test';
      doc.arr[0].last.should.equal 'TEST'
      doc.__doc.arr[0].last.should.equal 'TEST'
      
      doc.arr.push({first: 'Fun', last: 'Times'});
      doc.arr.length.should.equal 2
      doc.__doc.arr.length.should.equal 2
      
      doc.arr[1].first.should.equal 'Fun'
      doc.arr[1].last.should.equal 'TIMES'
      doc.__doc.arr[1].first.should.equal 'Fun'
      doc.__doc.arr[1].last.should.equal 'TIMES'
      
      doc.arr[1].last = 'Smith';
      doc.arr[1].last.should.equal 'SMITH'
      doc.__doc.arr[1].last.should.equal 'SMITH'
      
    end

    it 'should handle array of defined objects with nested array of objects w/ getter & setters (non strict)'
      var doc = new Document(
        { arr: [{first: 'Nathan', last: 'White', notes: [{note: 'test', tags: ['dev','test']}] }]},
        [{'arr': [['first','last', {notes: [[{'tags' : []},'note']] }]]}],
        { arr:{ name: function(){ return this.first + ' ' + this.last; } } },
        {arr:{last: function(val){ return val.toUpperCase(); }, notes : { note: function(val){ return val.toUpperCase(); } } } },
        false
      );      
    
      doc.arr[0].first.should.equal 'Nathan'
      doc.arr[0].last.should.equal 'WHITE'
      doc.arr[0].name.should.equal 'Nathan WHITE'
      doc.arr[0].notes[0].note.should.equal 'TEST'
      doc.arr[0].notes[0].tags[0].should.equal 'dev'
    
      doc.__doc.arr[0].first.should.equal 'Nathan'
      doc.__doc.arr[0].last.should.equal 'WHITE'
      doc.__doc.arr[0].name.should.be_undefined
      doc.__doc.arr[0].notes[0].note.should.equal 'TEST'
      doc.__doc.arr[0].notes[0].tags[0].should.equal 'dev'
      
      doc.arr[0].notes.push({note: 'another test', tags: ['random','tag']});
      
      doc.arr[0].notes.length.should.equal 2
      doc.__doc.arr[0].notes.length.should.equal 2
      
      doc.arr[0].notes[1].note.should.equal 'ANOTHER TEST'
      doc.arr[0].notes[1].tags[1].should.equal 'tag'
      
      doc.__doc.arr[0].notes[1].note.should.equal 'ANOTHER TEST'
      doc.__doc.arr[0].notes[1].tags[1].should.equal 'tag'     
      
      doc.arr[0].notes[1].tags.push('another');
      
      doc.arr[0].notes[1].tags.length.should.equal 3
      doc.__doc.arr[0].notes[1].tags.length.should.equal 3
      
      doc.arr.push({first: 'Some', last: 'Name'});
      
      doc.arr.length.should.equal 2
      doc.__doc.arr.length.should.equal 2
      
      doc.arr[1].name.should.equal 'Some NAME'
      doc.__doc.arr[1].name.should.be_undefined
      
      doc.arr[1].notes.length.should.equal 0
      doc.__doc.arr[1].notes.length.should.equal 0
      
      doc.arr[1].notes.push({note: 'tests are looking good', tags: ['tests']});
      
      doc.arr[1].notes.length.should.equal 1
      doc.__doc.arr[1].notes.length.should.equal 1     

      doc.arr[1].notes[0].note.should.equal 'TESTS ARE LOOKING GOOD'
      doc.__doc.arr[1].notes[0].note.should.equal 'TESTS ARE LOOKING GOOD'

      doc.arr[1].notes[0].tags[0].should.equal 'tests'
      doc.__doc.arr[1].notes[0].tags[0].should.equal 'tests'
      
      doc.arr[0].notes[0].remove();
      
      doc.arr[0].notes[0].note.should.equal 'ANOTHER TEST'
      doc.__doc.arr[0].notes[0].note.should.equal 'ANOTHER TEST'
      
      doc.arr[0].remove()
      
      doc.arr[0].name.should.equal 'Some NAME'
      doc.arr.length.should.equal 1
      doc.__doc.arr.length.should.equal 1
      
    end

    it 'should handle array of defined objects with nested array of objects w/ getter & setters (strict)'
      var doc = new Document(
        { arr: [{first: 'Nathan', last: 'White', notes: [{note: 'test', tags: ['dev','test']}] }]},
        [{'arr': [['first','last', {notes: [[{'tags' : []},'note']] }]]}],
        { arr:{ name: function(){ return this.first + ' ' + this.last; } } },
        {arr:{last: function(val){ return val.toUpperCase(); }, notes : { note: function(val){ return val.toUpperCase(); } } } },
        true
      );      
    
      doc.arr[0].first.should.equal 'Nathan'
      doc.arr[0].last.should.equal 'WHITE'
      doc.arr[0].name.should.equal 'Nathan WHITE'
      doc.arr[0].notes[0].note.should.equal 'TEST'
      doc.arr[0].notes[0].tags[0].should.equal 'dev'
    
      doc.__doc.arr[0].first.should.equal 'Nathan'
      doc.__doc.arr[0].last.should.equal 'WHITE'
      doc.__doc.arr[0].name.should.be_undefined
      doc.__doc.arr[0].notes[0].note.should.equal 'TEST'
      doc.__doc.arr[0].notes[0].tags[0].should.equal 'dev'
      
      doc.arr[0].notes.push({note: 'another test', tags: ['random','tag']});
      
      doc.arr[0].notes.length.should.equal 2
      doc.__doc.arr[0].notes.length.should.equal 2
      
      doc.arr[0].notes[1].note.should.equal 'ANOTHER TEST'
      doc.arr[0].notes[1].tags[1].should.equal 'tag'
      
      doc.__doc.arr[0].notes[1].note.should.equal 'ANOTHER TEST'
      doc.__doc.arr[0].notes[1].tags[1].should.equal 'tag'     
      
      doc.arr[0].notes[1].tags.push('another');
      
      doc.arr[0].notes[1].tags.length.should.equal 3
      doc.__doc.arr[0].notes[1].tags.length.should.equal 3
      
      doc.arr.push({first: 'Some', last: 'Name'});
      
      doc.arr.length.should.equal 2
      doc.__doc.arr.length.should.equal 2
      
      doc.arr[1].name.should.equal 'Some NAME'
      doc.__doc.arr[1].name.should.be_undefined
      
      doc.arr[1].notes.length.should.equal 0
      doc.__doc.arr[1].notes.length.should.equal 0
      
      doc.arr[1].notes.push({note: 'tests are looking good', tags: ['tests']});
      
      doc.arr[1].notes.length.should.equal 1
      doc.__doc.arr[1].notes.length.should.equal 1     

      doc.arr[1].notes[0].note.should.equal 'TESTS ARE LOOKING GOOD'
      doc.__doc.arr[1].notes[0].note.should.equal 'TESTS ARE LOOKING GOOD'

      doc.arr[1].notes[0].tags[0].should.equal 'tests'
      doc.__doc.arr[1].notes[0].tags[0].should.equal 'tests'
      
      doc.arr[0].notes[0].remove();
      
      doc.arr[0].notes[0].note.should.equal 'ANOTHER TEST'
      doc.__doc.arr[0].notes[0].note.should.equal 'ANOTHER TEST'
      
      doc.arr[0].remove()
      
      doc.arr[0].name.should.equal 'Some NAME'
      doc.arr.length.should.equal 1
      doc.__doc.arr.length.should.equal 1
      
    end



  end
end