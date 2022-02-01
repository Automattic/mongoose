'use strict';

const config = require('../.config');
const fs = require('fs');
const mongoose = require('../');

run().catch(err => {
  console.error(err);
  process.exit(-1);
});

async function run() {
  await mongoose.connect(config.uri);

  const Subscriber = mongoose.model('Subscriber', mongoose.Schema({
    companyName: String,
    description: String,
    url: String,
    logo: String
  }), 'Subscriber');

  const Job = mongoose.model('Job', mongoose.Schema({
    logo: String,
    company: String,
    title: String,
    location: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    }
  }), 'Job');

  try {
    fs.mkdirSync(`${__dirname}/data`);
  } catch(err) {}

  const subscribers = await Subscriber.
    find({ companyName: { $exists: true }, description: { $exists: true }, logo: { $exists: true } }).
    sort({ createdAt: 1 }).
    select({ companyName: 1, description: 1, url: 1, logo: 1 });
  fs.writeFileSync(`${__dirname}/data/sponsors.json`, JSON.stringify(subscribers, null, '  '));
  
  const jobs = await Job.find().select({ logo: 1, company: 1, title: 1, location: 1, description: 1, url: 1  });
  fs.writeFileSync(`${__dirname}/data/jobs.json`, JSON.stringify(jobs, null, '  '));

  console.log('Done');
  process.exit(0);
}