'use strict';

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/netlify');
mongoose.connection.dropDatabase();
