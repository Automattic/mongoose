'use strict';

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/netlify');
mongoose.connection.dropDatabase();
mongoose.connection.on('connected', () => {
    console.log('connected')
});