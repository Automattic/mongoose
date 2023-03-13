'use strict';

let config;
try {
  config = require('../.config.js');
} finally {
  if (!config || !config.uri) {
    console.error('No Config or config.URI given, please create a .config.js file with those values in the root of the repository');
    process.exit(-1);
  }
}
const axios = require('axios');
const fs = require('fs');
const mongoose = require('../');

run().catch(err => {
  console.error(err);
  process.exit(-1);
});

// only "." because fs resolves relative to the CWD instead of relative to __dirname
const docsDir = './docs';

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

  const OpenCollectiveSponsor = mongoose.model('OpenCollectiveSponsor', mongoose.Schema({
    openCollectiveId: {
      type: Number,
      required: true
    },
    website: {
      type: String,
      required: true
    },
    image: {
      type: String,
      required: true
    },
    alt: {
      type: String
    }
  }), 'OpenCollectiveSponsor');

  try {
    fs.mkdirSync(`${docsDir}/data`);
  } catch (err) {}

  const subscribers = await Subscriber.
    find({ companyName: { $exists: true }, description: { $exists: true }, logo: { $exists: true } }).
    sort({ createdAt: 1 }).
    select({ companyName: 1, description: 1, url: 1, logo: 1 });
  fs.writeFileSync(`${docsDir}/data/sponsors.json`, JSON.stringify(subscribers, null, '  '));

  const jobs = await Job.find().select({ logo: 1, company: 1, title: 1, location: 1, description: 1, url: 1 });
  fs.writeFileSync(`${docsDir}/data/jobs.json`, JSON.stringify(jobs, null, '  '));

  const opencollectiveSponsors = await axios.get('https://opencollective.com/mongoose/members.json').
    then(res => res.data).
    then(sponsors => {
      return sponsors.filter(result => result.tier == 'sponsor' && result.isActive);
    }).
    catch(() => null);

  for (const sponsor of opencollectiveSponsors) {
    const override = await OpenCollectiveSponsor.findOne({ openCollectiveId: sponsor['MemberId'] });
    if (override == null) {
      continue;
    }

    sponsor.website = override.website;
    sponsor.image = override.image;
    if (override.alt != null) {
      sponsor.alt = override.alt;
    }
  }

  const additionalSponsors = await OpenCollectiveSponsor.find({}).
    then(docs => docs.filter(doc => doc.openCollectiveId == null));
  for (const sponsor of additionalSponsors) {
    opencollectiveSponsors.push(sponsor);
  }

  if (opencollectiveSponsors != null) {
    fs.writeFileSync(`${docsDir}/data/opencollective.json`, JSON.stringify(opencollectiveSponsors, null, '  '));
  }

  console.log('Done');
  process.exit(0);
}
