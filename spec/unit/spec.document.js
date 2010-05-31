
describe 'Document'
  before_each
  end
  /*
  describe 'Simple'
    it 'should return object w/ strict'
      var doc = new Document(
                {name: 'test', data: 'test'}, // data
                ['name','data'], //schema
                {}, // getters
                {}, // setters
                true // strict
              );
      doc.__dirty.should.equal true
      doc.__doc.name.should.equal 'test'
      doc.name.should.equal 'test'
      doc.__doc.data.should.equal 'test'
      doc.data = 'replace'
      doc.__doc.data.should.equal 'replace'
    end
  end
  
  describe 'With Getters'
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
  
  describe 'With Setters w/ strict'
    it 'should return object'
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
  
  describe 'Embedded Object w/ strict'
    it 'should return object'
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
  end
  */
  describe 'Embedded Object w/ getter and strict'
    it 'should return object'
      var doc = new Document(
        {name: 'test', test: {phone: '555-555-5555'}},
        ['name',{'test':['phone']}],
        { test : { phone: function(){ require('sys').puts('FFDFDFDFDFD'); return '+1 '+this.phone; }  }},
        {},
        true
      );
      require('sys').p(doc.__doc);
      doc.test.phone.should.equal '+1 555-555-5555'
 //     doc.__doc.test.phone.should.equal '555-555-5555'
      
    end
  end

end