var BSON = require('../lib/mongodb').BSONNative.BSON,
  ObjectID = require('../lib/mongodb').BSONNative.ObjectID,
  debug = require('util').debug,
  inspect = require('util').inspect;

var BSON = require('../lib/mongodb').BSONPure.BSON;
var ObjectID = require('../lib/mongodb').BSONPure.ObjectID;

// require('util').debug(require('util').inspect(BSON))

var COUNT = 10000;
// var COUNT = 1;
// var object = {
//     string: "Strings are great",
//     decimal: 3.14159265,
//     bool: true,
//     integer: 5,
//     
//     subObject: {
//       moreText: "Bacon ipsum dolor sit amet cow pork belly rump ribeye pastrami andouille. Tail hamburger pork belly, drumstick flank salami t-bone sirloin pork chop ribeye ham chuck pork loin shankle. Ham fatback pork swine, sirloin shankle short loin andouille shank sausage meatloaf drumstick. Pig chicken cow bresaola, pork loin jerky meatball tenderloin brisket strip steak jowl spare ribs. Biltong sirloin pork belly boudin, bacon pastrami rump chicken. Jowl rump fatback, biltong bacon t-bone turkey. Turkey pork loin boudin, tenderloin jerky beef ribs pastrami spare ribs biltong pork chop beef.",
//       longKeylongKeylongKeylongKeylongKeylongKey: "Pork belly boudin shoulder ribeye pork chop brisket biltong short ribs. Salami beef pork belly, t-bone sirloin meatloaf tail jowl spare ribs. Sirloin biltong bresaola cow turkey. Biltong fatback meatball, bresaola tail shankle turkey pancetta ham ribeye flank bacon jerky pork chop. Boudin sirloin shoulder, salami swine flank jerky t-bone pork chop pork beef tongue. Bresaola ribeye jerky andouille. Ribeye ground round sausage biltong beef ribs chuck, shank hamburger chicken short ribs spare ribs tenderloin meatloaf pork loin."
//     },
//     
//     subArray: [1,2,3,4,5,6,7,8,9,10],
//     anotherString: "another string"
// }

var x, start, end, i
var objectBSON, objectJSON

console.log(COUNT + "x (objectBSON = BSON.serialize(object))")
start = new Date

for (i=COUNT; --i>=0; ) {
  var object = {
      id: new ObjectID(),
      string: "Strings are great",
      decimal: 3.14159265,
      bool: true,
      integer: 5,

      subObject: {
        moreText: "Bacon ipsum dolor sit amet cow pork belly rump ribeye pastrami andouille. Tail hamburger pork belly, drumstick flank salami t-bone sirloin pork chop ribeye ham chuck pork loin shankle. Ham fatback pork swine, sirloin shankle short loin andouille shank sausage meatloaf drumstick. Pig chicken cow bresaola, pork loin jerky meatball tenderloin brisket strip steak jowl spare ribs. Biltong sirloin pork belly boudin, bacon pastrami rump chicken. Jowl rump fatback, biltong bacon t-bone turkey. Turkey pork loin boudin, tenderloin jerky beef ribs pastrami spare ribs biltong pork chop beef.",
        longKeylongKeylongKeylongKeylongKeylongKey: "Pork belly boudin shoulder ribeye pork chop brisket biltong short ribs. Salami beef pork belly, t-bone sirloin meatloaf tail jowl spare ribs. Sirloin biltong bresaola cow turkey. Biltong fatback meatball, bresaola tail shankle turkey pancetta ham ribeye flank bacon jerky pork chop. Boudin sirloin shoulder, salami swine flank jerky t-bone pork chop pork beef tongue. Bresaola ribeye jerky andouille. Ribeye ground round sausage biltong beef ribs chuck, shank hamburger chicken short ribs spare ribs tenderloin meatloaf pork loin."
      },

      subArray: [1,2,3,4,5,6,7,8,9,10],
      anotherString: "another string"
  }

  objectBSON = BSON.serialize(object, null, true)
}

end = new Date
console.log("bson size (bytes): ", objectBSON.length)
console.log("time = ", end - start, "ms -", COUNT * 1000 / (end - start), " ops/sec")


// console.log(COUNT + "x (objectJSON = JSON.stringify(object))")
// start = new Date
// 
// for (i=COUNT; --i>=0; ) {
//     objectJSON = JSON.stringify(object)
// }
// 
// end = new Date
// console.log("json size (chars): ", objectJSON.length)
// console.log("time = ", end - start, "ms -", COUNT * 1000 / (end - start), " ops/sec")


console.log(COUNT + " BSON.deserialize(objectBSON)")
start = new Date

for (i=COUNT; --i>=0; ) {
  x = BSON.deserialize(objectBSON)
  // debug("=====================================================================")
  // debug(inspect(x))
  // x = BSON.deserialize2(objectBSON)
  // debug(inspect(x))
}

end = new Date
console.log("time = ", end - start, "ms -", COUNT * 1000 / (end - start), " ops/sec")


// console.log(COUNT + " JSON.parse(objectJSON)")
// start = new Date
// 
// for (i=COUNT; --i>=0; ) {
//     x = JSON.parse(objectJSON)
// }
// 
// end = new Date
// console.log("time = ", end - start, "ms -", COUNT * 1000 / (end - start), " ops/sec")
