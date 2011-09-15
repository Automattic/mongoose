
/**
 * Test dependencies.
 */

var start = require('./common')
, should = require('should')
, mongoose = start.mongoose
, random = require('../lib/utils').random
, Schema = mongoose.Schema
, ObjectId = Schema.ObjectId
, DocObjectId = mongoose.Types.ObjectId
, NativeCollection = mongoose.NativeCollection

/**
 * Setup.
 */

/**
 * Employee Schema
 */


// override methods for collection

function prepareU(db,collectionName){

    var userDef = new Schema({
        thingType:{
            type:String,
            "default":"User",
            index: true
        },
        login: {
            required: true,
            type: String
        },
        password: {
            required: true,
            type: String
        },
        age: {
            required: true,
            type: Number
        }
    },{
        collection:collectionName
    });

    var User$collection = db.model("User",userDef);

    // find
    User$collection.basefind = User$collection.find;
    User$collection.find = function (conditions, fields, options, callback) {
        if ('function' == typeof conditions) {
            callback = conditions;
            conditions = {};
            fields = null;
            options = null;
        } else if ('function' == typeof fields) {
            callback = fields;
            fields = null;
            options = null;
        } else if ('function' == typeof options) {
            callback = options;
            options = null;
        }

        if (conditions == undefined)
            conditions = {};

        conditions['thingType'] = "User";
        return this.basefind(conditions, fields, options, callback);
    }
    //findOne
    User$collection.baseFindOne = User$collection.findOne;
    User$collection.findOne = function (conditions, fields, options, callback) {
        if ('function' == typeof conditions) {
            callback = conditions;
            conditions = {};
            fields = null;
            options = null;
        } else if ('function' == typeof fields) {
            callback = fields;
            fields = null;
            options = null;
        } else if ('function' == typeof options) {
            callback = options;
            options = null;
        }

        if (conditions == undefined)
            conditions = {};

        conditions['thingType'] = "User";
        return this.baseFindOne(conditions, fields, options, callback);
    }
    return User$collection;
}
/**
* Group Schema
*/


function prepareG(db,collectionName){

    var groupDef = new Schema({
        thingType:{
            type:String,
            "default":"Group",
            index: true
        },
        name: {
            required: true,
            type: String
        }
    },{
        collection:collectionName
    });

    var Group$collection = db.model("Group",groupDef);

    // find
    Group$collection.basefind = Group$collection.find;
    Group$collection.find = function (conditions, fields, options, callback) {
        if ('function' == typeof conditions) {
            callback = conditions;
            conditions = {};
            fields = null;
            options = null;
        } else if ('function' == typeof fields) {
            callback = fields;
            fields = null;
            options = null;
        } else if ('function' == typeof options) {
            callback = options;
            options = null;
        }

        if (conditions == undefined)
            conditions = {};

        conditions['thingType'] = "Group";
        return this.basefind(conditions, fields, options, callback);
    }
    //findOne
    Group$collection.baseFindOne = Group$collection.findOne;
    Group$collection.findOne = function (conditions, fields, options, callback) {
        if ('function' == typeof conditions) {
            callback = conditions;
            conditions = {};
            fields = null;
            options = null;
        } else if ('function' == typeof fields) {
            callback = fields;
            fields = null;
            options = null;
        } else if ('function' == typeof options) {
            callback = options;
            options = null;
        }

        if (conditions == undefined)
            conditions = {};

        conditions['thingType'] = "Group";
        return this.baseFindOne(conditions, fields, options, callback);
    }
    return Group$collection;
}
/**
* EmployeeGroup Schema
*/


function prepareUG(db,collectionName){


    var _userGroupsDef = new Schema({
        name:{
            type:String,
            "default":"UserGroups",
            index:true
        },
        user:{
            type:ObjectId,
            required:true,
            index:true,
            ref:"User"
        },
        group:{
            type:ObjectId,
            required:true,
            index:true,
            ref:"Group"
        }
    },{
        collection:collectionName
    });
    _userGroupsDef.method("relate",function(relConf){
        var a = relConf["user"];
        var b = relConf["group"];
        if(!a || !b) throw "Parameters Names Mismatch for relate function";

        var self = this;
        if(a.isNew){
            a.save(function(err, a_saved){
                if(err) throw err;
                if(b.isNew){
                    b.save(function(err,b_saved){
                        if(err) throw err;

                        connect(a_saved,b_saved);
                    });
                }else{
                    connect(a_saved, b);
                }
            });
        }else{
            if(b.isNew){
                b.save(function(err,b_saved){
                    if(err) throw err;
                    connect(a,b_saved);
                });
            }else{
                connect(a, b);
            }
        }
        function connect(_from,_to){
            self.set("user",_from.get("_id"));
            self.set("group", _to.get("_id"));
            self.save();
        }
    });

    var UserGroups$collection = db.model("UserGroups",_userGroupsDef);
    // find
    UserGroups$collection.basefind = UserGroups$collection.find;
    UserGroups$collection.find = function (conditions, fields, options, callback) {
        if ('function' == typeof conditions) {
            callback = conditions;
            conditions = {};
            fields = null;
            options = null;
        } else if ('function' == typeof fields) {
            callback = fields;
            fields = null;
            options = null;
        } else if ('function' == typeof options) {
            callback = options;
            options = null;
        }

        if (conditions == undefined)
            conditions = {};

        conditions['name'] = "UserGroups";
        var ret = this.basefind(conditions, fields, options);
        ret = ret.populate("group").populate("user");
        return ret.exec(callback);
    }
    //findOne
    UserGroups$collection.baseFindOne = UserGroups$collection.findOne;
    UserGroups$collection.findOne = function (conditions, fields, options, callback) {
        if ('function' == typeof conditions) {
            callback = conditions;
            conditions = {};
            fields = null;
            options = null;
        } else if ('function' == typeof fields) {
            callback = fields;
            fields = null;
            options = null;
        } else if ('function' == typeof options) {
            callback = options;
            options = null;
        }

        if (conditions == undefined)
            conditions = {};

        conditions['name'] = "UserGroups";
        var ret = this.baseFindOne(conditions, fields, options);
        ret = ret.populate("group").populate("user");
        return ret.exec(callback);
    }
    return UserGroups$collection;
}

/**
* Test Data Generation
*/
/**
* Tests.
*/

module.exports = {

    'test populating data from referenced schemas with same collection': function () {
        var collectionName = "things_"+random();
        var db = start(),
        User = prepareU(db,collectionName),
        Group = prepareG(db,collectionName),
        UserGroups = prepareUG(db,collectionName)

        new User({
            login:"some one",
            password:"strong",
            age:10
        }).save(function(err,u1){
            should.strictEqual(err, null);
            var g1 = new Group({
                name:"First Group"
            }).save(function(err,g1){
                should.strictEqual(err, null);
                var rel = new UserGroups();
                rel.relate({
                    group:g1,
                    user:u1
                });
                rel.save(function(err,data){
                    UserGroups.findOne({},function(err,data){
                        //ref test
                        should.strictEqual(err, null);
                        data.should.be.an.instanceof(UserGroups);
                        data.user.should.be.an.instanceof(User);
                        data.group.should.be.an.instanceof(Group);
                        //in the collection must be 3 items now
                        db.db.collection(collectionName,function(err,coll){
                            coll.count({},function(err,data){
                                should.strictEqual(err, null);
                                data.should.equal(3,"there must me 3 items for now");
                                db.close();
                            })
                        })
                    })
                });
            });
        });
    }
};
