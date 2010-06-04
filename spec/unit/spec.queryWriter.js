QueryWriter = require('model/queryWriter').QueryWriter

describe 'QueryWriter'
  describe 'Find'
  
    it 'should add $where to find object'
      var qw = new QueryWriter('find',[]);
      qw.where('x == 3');
      qw.args[0].$where.should.equal 'x == 3'
    end

    it 'should handle sort/limit/skip/hint/timeout'
      var qw = new QueryWriter('find',[]);
      
      qw.sort('x');
      qw.args[2].sort.should.equal 'x'
      
      qw.limit(5);
      qw.args[2].limit.should.equal 5
      
      qw.skip(5);
      qw.args[2].skip.should.equal 5
      
      qw.hint(true);
      qw.args[2].hint.should.equal true
      
      qw.timeout(true);
      qw.args[2].timeout.should.equal true
      
      qw.limit(10);
      qw.args[2].limit.should.equal 10
      
    end    
    
    it 'should handle has/nin/ne/gt/gte/lt/lte/min/max/mod/all/size/exists'
      var qw = new QueryWriter('find',[]);

      qw.has({x : [1,2,3]});
      qw.args[0].x.$in.should.be_an_instance_of Array
      
      qw.nin({x : [1,2,3]});
      qw.args[0].x.$nin.should.be_an_instance_of Array
      
      qw.ne({x : 2, y : 3});
      qw.args[0].x.$ne.should.equal 2
      qw.args[0].y.$ne.should.equal 3
      
      qw.gt({x : 5});
      qw.args[0].x.$gt.should.equal 5
      
      qw.gte({x : 6});
      qw.args[0].x.$gte.should.equal 6
      
      qw.lt({x : 7});
      qw.args[0].x.$lt.should.equal 7
      
      qw.lte({x : 8});
      qw.args[0].x.$lte.should.equal 8
      
      qw.min({x : 9});
      qw.args[0].x.$min.should.equal 9
      
      qw.max({x : 10});
      qw.args[0].x.$max.should.equal 10
      
      qw.mod({x : [10,1]});
      qw.args[0].x.$mod.should.be_an_instance_of Array
      
      qw.all({x : [1,2,3]});
      qw.args[0].x.$all.should.be_an_instance_of Array
      
      qw.size({x : 3});
      qw.args[0].x.$size.should.equal 3
      
      qw.exists({x : true})
      qw.args[0].x.$exists.should.equal true
      
    end
  end
  
  describe 'Update'
  
    it 'should handle updateAll,upsert,upsertAll properly'
      var qw = new QueryWriter('updateAll',[]);
      qw.args[2].multi.should.equal true
      
      var qw = new QueryWriter('upsert',[]);
      qw.args[2].upsert.should.equal true
      
      var qw = new QueryWriter('upsertAll',[]);
      qw.args[2].upsert.should.equal true
      qw.args[2].multi.should.equal true
    end
    
    it 'should handle inc/set/unset/push/pushAll/addToSet/pop/pull/pullAll'
      var qw = new QueryWriter('update',[]);
      qw.inc({x : 2, y: 3});
      qw.args[1].$inc.x.should.equal 2
      qw.args[1].$inc.y.should.equal 3
      
    end
  
  end
end
