Model = require('./lib/model').Model
mongoose = require('mongoose').Mongoose
    
mongoose.model('User', {
  
  properties: ['name', 'last'],
  
  static: {
    
    findByName: function(){
      
    }
    
  }
  
})

db = mongoose.connect('mongodb://localhost/fake') // fake!

describe 'Model'
  
  describe 'Class generation'
    it 'should generate a class'
      user = db.model('User')
      
    end
  end
  
  describe 'Statics'
    
  end
  
  describe 'Getters/setters'
    
  end
  
end