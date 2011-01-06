//
//  Tests for ObjectID
//
describe 'ObjectID'
  before_each
  end
  
  describe 'generationTime'
    it 'should return the time the ObjectID was created in milliseconds'
      var now = parseInt(((new Date) / 1000))*1000
        , id = new mongo.ObjectID()
      id.generationTime.should.eql now
    end
  end
end