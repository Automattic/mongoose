var tbd = require('tbd');
var mongoose = require('../');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var turns = process.argv[2] ? process.argv[2] | 0 : 5;
var dicCnt = process.argv[3] ? process.argv[3] | 0 : 100;
var mainCnt = process.argv[4] ? process.argv[4] | 0 : 25;

var load = {};

function createRandomWord(len) {
  var cons = 'bcdfghjklmnpqrstvwxyz';
  var vow = 'aeiou';
  var i, word = '', length = parseInt(len, 10), consonants = cons.split(''), vowels = vow.split('');
  function rand(limit) {
    return Math.floor(Math.random() * limit);
  }
  for (i = 0; i < length / 2; i++) {
    var randConsonant = consonants[rand(consonants.length)],
        randVowel = vowels[rand(vowels.length)];
    word += (i === 0) ? randConsonant.toUpperCase() : randConsonant;
    word += i * 2 < length - 1 ? randVowel : '';
  }
  return word;
}

mongoose.model('Medication', Schema({
  catCode: {type: String},
  concentration: {type: String},
  medicationName: {type: String, required: true},
  notes: {type: String},
  qty: {type: Number}
}));

load.Medication = tbd.from({
  catCode: '{ type: String }',
  concentration: '{ type: String }',
  medicationName: '{ type: String, required: true }',
  notes: '{ type: String }',
  qty: 10
}).make(dicCnt);

mongoose.model('Prescription', Schema({
  age: {type: Number},
  city: {type: String},
  clientID: {type: String, required: true},
  clinic: {type: String},
  customerName: {type: String},
  dateNow: {type: Date},
  district: {type: String},
  fax: {type: String},
  firstName: {type: String},
  gender: {type: String},
  lastName: {type: String},
  mobile: {type: String},
  physicianLicenseNumber: {type: Number},
  physicianName: {type: String},
  prescription: {type: String},
  refByDoctor: {type: String},
  stampImage: {type: String},
  street: {type: String},
  tel: {type: String}
}));

load.Prescription = tbd.from({
  age: 50,
  city: '{ type: String }',
  clientID: '{ type: String, required: true }',
  clinic: '{type: String }',
  customerName: '{ type: String}',
  dateNow: new Date(),
  district: '{ type: String}',
  fax: '{ type: String}',
  firstName: '{ type: String}',
  gender: '{ type: String}',
  lastName: '{ type: String}',
  mobile: '{ type: String}',
  physicianLicenseNumber: 15,
  physicianName: '{ type: String}',
  prescription: '{ type: String}',
  refByDoctor: '{ type: String}',
  stampImage: '{ type: String}',
  street: '{ type: String}',
  tel: '{ type: String }'
}).make(dicCnt);

mongoose.model('Observation', Schema({
  observationCode: {type: Number},
  observationDesc: {type: String},
  observationGroup: {
    type: String
  }
}));

load.Observation = tbd.from({
  observationCode: 100,
  observationDesc: '{ type: String}',
  observationGroup: '{ type: String}'
}).make(dicCnt);

mongoose.model('Heart', Schema({
  abdominalAscites: {type: String},
  abdominalCondition: {type: String},
  abdominalLocation: {type: String},
  heartLocation: {type: String},
  heartOther: {type: String},
  murmur: {type: String},
  npeHeart: {type: Boolean},
  rythm: {type: String},
  sounds: {
    type: String
  }
}));

load.Heart = tbd.from({
  abdominalAscites: ' { type: String}',
  abdominalCondition: '{ type: String}',
  abdominalLocation: '{ type: String}',
  heartLocation: ' { type: String}',
  heartOther: '{ type: String}',
  murmur: '{ type: String}',
  npeHeart: true,
  rythm: '{ type: String}',
  sounds: '{ type: String }'
}).make(dicCnt);

mongoose.model('PereferialPulse', Schema({
  leftDP: {type: String},
  leftFemoral: {type: String},
  leftPopliteal: {type: String},
  leftTP: {type: String},
  rightDP: {type: String},
  rightTP: {type: String},
  rigthFemoral: {type: String},
  rigthPopliteal: {
    type: String
  }
}));

load.PereferialPulse = tbd.from({
  leftDP: '{ type: String}',
  leftFemoral: '{ type: String}',
  leftPopliteal: '{ type: String}',
  leftTP: '{ type: String}',
  rightDP: '{ type: String}',
  rightTP: '{ type: String}',
  rigthFemoral: '{ type: String}',
  rigthPopliteal: '{ type: String}'
}).make(dicCnt);

mongoose.model('Treatment', Schema({
  notes: {type: String},
  treatmentCode: {type: String},
  treatmentName: {
    type: String, required: true
  }
}));

load.Treatment = tbd.from({
  notes: '{ type: String}',
  treatmentCode: '{ type: String}',
  treatmentName: '{ type: String, required: true}'
}).make(dicCnt);

mongoose.model('VitalSign', Schema({
  O2: {type: String},
  diastole: {type: String},
  heartSounds: {type: String},
  height: {type: String},
  lMin: {type: String},
  pulse: {type: String},
  respiratoryRate: {type: String},
  roomAir: {type: String},
  sugar: {type: String},
  systole: {type: String},
  temperature: {type: String},
  urineE: {type: String},
  urineG: {type: String},
  urineK: {type: String},
  urineL: {type: String},
  urineN: {type: String},
  urineP: {type: String},
  weight: {
    type: String
  }
}));

load.VitalSign = tbd.from({
  O2: '{ type: String}',
  diastole: '{ type: String}',
  heartSounds: '{ type: String}',
  height: '{ type: String}',
  lMin: '{ type: String}',
  pulse: '{ type: String}',
  respiratoryRate: ' { type: String}',
  roomAir: '{ type: String}',
  sugar: '{ type: String}',
  systole: '{ type: String}',
  temperature: '{ type: String}',
  urineE: '{ type: String}',
  urineG: '{ type: String}',
  urineK: '{ type: String}',
  urineL: ' { type: String}',
  urineN: '{ type: String}',
  urineP: '{ type: String}',
  weight: '{ type: String}'
}).make(dicCnt);

mongoose.model('FluidsProgram', Schema({
  name: String
}));

load.FluidsProgram = tbd.from({
  name: 'String'
}).make(dicCnt);

mongoose.model('Allergy', Schema({
  allergy: {type: String, required: true},
  notes: {
    type: String
  }
}));

load.Allergy = tbd.from({
  allergy: '{ type: String, required: true}',
  notes: '{ type: String }'
}).make(dicCnt);

mongoose.model('Head', Schema({
  ears: {type: String},
  neckMurmur: {type: String},
  normalEarRight: {type: Boolean},
  npeEyeRight: {type: Boolean},
  npeNeck: {type: Boolean},
  npePharynx: {type: Boolean},
  pharunxField: {type: String},
  pharynxRed: {type: Boolean},
  pharynxRedEf: {type: Boolean},
  preEyeLeft: {type: Boolean},
  pupilLeft: {type: String},
  pupilRight: {type: String},
  reactive: {type: Boolean},
  redness: {type: String},
  secreting: {type: Boolean},
  venousCongestion: {
    type: Boolean
  }
}));

load.Head = tbd.from({
  ears: '{ type: String}',
  neckMurmur: '{ type: String}',
  normalEarRight: false,
  npeEyeRight: false,
  npeNeck: false,
  npePharynx: false,
  pharunxField: '{ type: String}',
  pharynxRed: false,
  pharynxRedEf: false,
  preEyeLeft: false,
  pupilLeft: '{ type: String}',
  pupilRight: '{ type: String}',
  reactive: false,
  redness: '{ type: String}',
  secreting: false,
  venousCongestion: false
}).make(dicCnt);

mongoose.model('Sckeletal', Schema({
  consiousness: {type: String},
  dvtSigns: {type: Boolean},
  edema: {type: String},
  limbsPeripheralPulse: {type: String},
  musculoskeletal: {type: String},
  neurCerebellum: {type: String},
  neurCranialNerves: {type: String},
  neurNeckStiffiness: {type: Boolean},
  neurSideSign: {type: Boolean},
  npeLimbs: {type: Boolean},
  npeMusco: {type: Boolean},
  npeNeurologi: {type: Boolean},
  reflexes: {
    type: String
  }
}));

load.Sckeletal = tbd.from({
  consiousness: '{ type: String}',
  dvtSigns: false,
  edema: '{ type: String}',
  limbsPeripheralPulse: '{ type: String}',
  musculoskeletal: '{ type: String}',
  neurCerebellum: '{ type: String}',
  neurCranialNerves: '{ type: String}',
  neurNeckStiffiness: false,
  neurSideSign: false,
  npeLimbs: false,
  npeMusco: false,
  npeNeurologi: false,
  reflexes: '{ type: String}'
}).make(dicCnt);

mongoose.model('Pulse', Schema({
  rate: String
}));

load.Pulse = tbd.from({
  rate: 'String'
}).make(dicCnt);

mongoose.model('Supplier', Schema({
  supplierDescription: {type: String},
  supplierQty: {type: Number},
  supplierRemarks: {
    type: String
  }
}));

load.Supplier = tbd.from({
  supplierDescription: ' { type: String}',
  supplierQty: 5,
  supplierRemarks: '{ type: String }'
}).make(dicCnt);

mongoose.model('Gastrointestinal', Schema({
  leftKidney: {type: String},
  liver: {type: String},
  rightKidney: {type: String},
  spleen: {
    type: String
  }
}));

load.Gastrointestinal = tbd.from({
  leftKidney: '{ type: String}',
  liver: '{ type: String}',
  rightKidney: '{ type: String}',
  spleen: '{ type: String }'
}).make(dicCnt);

mongoose.model('Ecg', Schema({
  ecgAxis: {type: String},
  ecgConduction: {type: String},
  ecgIschemia: {type: String},
  ecgRate: {type: String},
  ecgRythem: {type: String},
  generalCondition: {
    type: String
  }
}));

load.Ecg = tbd.from({
  ecgAxis: '{ type: String}',
  ecgConduction: '{ type: String}',
  ecgIschemia: '{ type: String}',
  ecgRate: '{ type: String}',
  ecgRythem: '{ type: String}',
  generalCondition: ' { type: String }'
}).make(dicCnt);

mongoose.model('Diagnose', Schema({
  diagNotes: {type: String},
  diagnoseGroup: {type: String},
  diagnoseName: {type: String, required: true},
  idDiagnose: {
    type: String
  }
}));

load.Diagnose = tbd.from({
  diagNotes: '{ type: String}',
  diagnoseGroup: '{ type: String}',
  diagnoseName: '{ type: String, required: true}',
  idDiagnose: '{ type: String }'
}).make(dicCnt);

mongoose.model('Conclusion', Schema({
  approver: {type: String},
  daysScheduleVisits: {type: String},
  doctorLicense: {type: String},
  doctorName: {type: String},
  emergencyRoomReferral: {type: String},
  futureVisitIn: {type: Number},
  labelAddition: {type: String},
  lavelVisit: {type: String},
  nowData: {type: Date},
  periodical: {type: String},
  presentedTo: {type: String},
  stampImage: {
    type: String
  }
}));

load.Conclusion = tbd.from({
  approver: '{ type: String}',
  daysScheduleVisits: '{ type: String}',
  doctorLicense: '{ type: String}',
  doctorName: '{ type: String}',
  emergencyRoomReferral: '{ type: String}',
  futureVisitIn: 112,
  labelAddition: '{ type: String}',
  lavelVisit: '{ type: String}',
  nowData: new Date(),
  periodical: '{ type: String}',
  presentedTo: '{ type: String}',
  stampImage: '{ type: String }'
}).make(dicCnt);

function getItem(list) {
  return function() {
    var cnt = Math.floor(Math.random() * dicCnt);
    return list[cnt];
  };
}

mongoose.model('MedicalCard', Schema({
  firstName: String,
  lastName: String,
  medication: [{type: ObjectId, ref: 'Medication'}],
  prescription: [{type: ObjectId, ref: 'Prescription'}],
  observation: [{type: ObjectId, ref: 'Observation'}],
  heart: [{type: ObjectId, ref: 'Heart'}],
  pereferialPulse: [{type: ObjectId, ref: 'PereferialPulse'}],
  treatment: [{type: ObjectId, ref: 'Treatment'}],
  vitalSign: [{type: ObjectId, ref: 'VitalSign'}],
  fluidsProgram: [{type: ObjectId, ref: 'FluidsProgram'}],
  allergy: [{type: ObjectId, ref: 'Allergy'}],
  head: [{type: ObjectId, ref: 'Head'}],
  sckeletal: [{type: ObjectId, ref: 'Sckeletal'}],
  pulse: [{type: ObjectId, ref: 'Pulse'}],
  supplier: [{type: ObjectId, ref: 'Supplier'}],
  gastrointestinal: [{type: ObjectId, ref: 'Gastrointestinal'}],
  ecg: [{type: ObjectId, ref: 'Ecg'}],
  diagnose: {type: ObjectId, ref: 'Diagnose'},
  conclusion: {type: ObjectId, ref: 'Conclusion'}
}));

var collectionsNames = Object.keys(load);
var i, cn;
var len = collectionsNames.length;
var creatList = [];
for (i = 0; i < len; i++) {
  cn = collectionsNames[i];
  creatList.push({list: load[cn], collection: mongoose.model(cn).collection.name, model: cn});
}


var db = mongoose.createConnection('localhost', 'HeavyLoad', function() {
  function getItems(list) {
    if (!list) {
      done();
    }
    return function() {
      var cnt = Math.floor(Math.random() * dicCnt);
      var i, res = [];
      for (i = 0; i < cnt; i++) {
        res.push(list[i]);
      }
      return res;
    };
  }

  var cnt = creatList.length;
  var length = cnt;
  var runResults = {};
  var finalResults = {};
  var doBenchmark = function() {
    var mc = db.model('MedicalCard');
    var run = [];

    run.push({
      name: 'findAll lean=false',
      qry: mc.find({})
      .populate('medication')
      .populate('prescription')
      .populate('observation')
      .populate('heart')
      .populate('pereferialPulse')
      .populate('treatment')
      .populate('vitalSign')
      .populate('fluidsProgram')
      .populate('allergy')
      .populate('head')
      .populate('sckeletal')
      .populate('pulse')
      .populate('supplier')
      .populate('gastrointestinal')
      .populate('ecg')
      .populate('diagnose')
      .populate('conclusion')
    });

    run.push({
      name: 'findOne lean=false',
      qry: mc.findOne({})
      .populate('medication')
      .populate('prescription')
      .populate('observation')
      .populate('heart')
      .populate('pereferialPulse')
      .populate('treatment')
      .populate('vitalSign')
      .populate('fluidsProgram')
      .populate('allergy')
      .populate('head')
      .populate('sckeletal')
      .populate('pulse')
      .populate('supplier')
      .populate('gastrointestinal')
      .populate('ecg')
      .populate('diagnose')
      .populate('conclusion')
    });

    run.push({
      name: 'findAll lean=true',
      qry: mc.find({})
      .lean()
      .populate('medication')
      .populate('prescription')
      .populate('observation')
      .populate('heart')
      .populate('pereferialPulse')
      .populate('treatment')
      .populate('vitalSign')
      .populate('fluidsProgram')
      .populate('allergy')
      .populate('head')
      .populate('sckeletal')
      .populate('pulse')
      .populate('supplier')
      .populate('gastrointestinal')
      .populate('ecg')
      .populate('diagnose')
      .populate('conclusion')
    });

    run.push({
      name: 'findOne lean=true',
      qry: mc.findOne({})
      .lean()
      .populate('medication')
      .populate('prescription')
      .populate('observation')
      .populate('heart')
      .populate('pereferialPulse')
      .populate('treatment')
      .populate('vitalSign')
      .populate('fluidsProgram')
      .populate('allergy')
      .populate('head')
      .populate('sckeletal')
      .populate('pulse')
      .populate('supplier')
      .populate('gastrointestinal')
      .populate('ecg')
      .populate('diagnose')
      .populate('conclusion')
    });

    var gcnt = run.length;
    var qryName;
    var turn = turns;
    var nextQuery = function(err) {
      if (err) {
        done();
      } else if (--gcnt >= 0) {
        qryName = run[gcnt].name;
        console.log('query ', gcnt);
        runResults[qryName] = {};
        turn = turns;
        nextRun();
      } else {
        done();
      }
    };

    var nextRun = function(err) {
      if (err) {
        return nextQuery(err);
      }
      if (turn < turns) {
        var res = runResults[qryName][turn];
        res.finish = new Date();
        console.log(res.finish - res.start);
      }
      if (--turn >= 0) {
        console.log('turn ', turn);
        runResults[qryName][turn] = {start: new Date()};
        run[gcnt].qry.exec(nextRun);
      } else {
        nextQuery();
      }
    };
    console.log('start benchmark');
    nextQuery();
  };

  var createRelations = function() {
    var coll = db.db.collection('medicalcards');
    console.log('Main Collection prepare');
    coll.remove({}, function() {
      console.log('clean collection done');
      var loadMedicalCard = tbd.from({})
      .prop('firstName').use(function() {
        return createRandomWord(10);
      }).done()
      .prop('lastName').use(function() {
        return createRandomWord(10);
      }).done()
      .prop('medication').use(getItems(load.Medication)).done()
      .prop('prescription').use(getItems(load.Prescription)).done()
      .prop('observation').use(getItems(load.Observation)).done()
      .prop('heart').use(getItems(load.Heart)).done()
      .prop('pereferialPulse').use(getItems(load.PereferialPulse)).done()
      .prop('treatment').use(getItems(load.Treatment)).done()
      .prop('vitalSign').use(getItems(load.VitalSign)).done()
      .prop('fluidsProgram').use(getItems(load.FluidsProgram)).done()
      .prop('allergy').use(getItems(load.Allergy)).done()
      .prop('head').use(getItems(load.Head)).done()
      .prop('sckeletal').use(getItems(load.Sckeletal)).done()
      .prop('pulse').use(getItems(load.Pulse)).done()
      .prop('supplier').use(getItems(load.Supplier)).done()
      .prop('gastrointestinal').use(getItems(load.Gastrointestinal)).done()
      .prop('ecg').use(getItems(load.Ecg)).done()
      .prop('diagnose').use(getItem(load.Diagnose)).done()
      .prop('conclusion').use(getItem(load.Conclusion)).done()
      .make(mainCnt);

      var saveAll = function(err) {
        if (err) {
          done();
        } else if (--res === 0) {
          console.log('save done');
          doBenchmark();
        }
      };

      var res = loadMedicalCard.length;
      var mc = db.model('MedicalCard');
      var i;
      var len = loadMedicalCard.length;
      for (i = 0; i < len; i++) {
        new mc(loadMedicalCard[i]).save(saveAll);
      }
    });
  };


  function done() {
    var qrs = Object.keys(runResults);
    var i, qry;
    var len = qrs.length;
    for (i = 0; i < len; i++) {
      qry = runResults[qrs[i]];
      var resSet = Object.keys(qry);
      var j, rs;
      var rsLen = resSet.length;
      var sum = 0;
      for (j = 0; j < rsLen; j++) {
        rs = qry[resSet[j]];
        sum += rs.finish - rs.start;
      }

      finalResults.rowCnt = mainCnt;
      finalResults.dicCnt = dicCnt;
      finalResults.turns = turns;

      finalResults[qrs[i]] = sum / rsLen;
      // qry.sum = sum;
      // qry.avg = sum / rsLen;
    }
    console.log();

    console.log('reasonable results:', {
      rowCnt: 25,
      dicCnt: 100,
      turns: 5,
      'findOne lean=true': 34,
      'findAll lean=true': 241.2,
      'findOne lean=false': 84,
      'findAll lean=false': 325
    });

    console.log();
    console.log('actual results', finalResults);

    mongoose.disconnect();
  }

  var updated = {};
  var next = function(err, data) {
    if (cnt < length && Array.isArray(data)) {
      // debugger
      var modelName = creatList[cnt].model;
      var items = load[modelName];
      updated[cnt] = modelName;
      items.length = 0;
      items.push.apply(items, data);
    }

    if (err) {
      return done(err);
    }
    if (--cnt >= 0) {
      var item = creatList[cnt];
      var coll = db.db.collection(item.collection);
      console.log(item.model);
      coll.remove({}, function() {
        coll.save(item.list, function() {
          var mdl = db.model(item.model);
          mdl.find({}, next);
        });
      });
    } else {
      createRelations(err);
    }
  };
  console.log('Dictionaries:');
  next();
});
