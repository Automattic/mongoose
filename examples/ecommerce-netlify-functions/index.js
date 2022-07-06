'use strict';

const mongoose = require('mongoose');


mongoose.connection.on('connected', () => {
    console.log('connected')
});

let conn = null;

module.exports = async function connect() {
    if (conn != null) {
        return conn;
    }
    conn = mongoose.connection;
    await mongoose.connect('mongodb://localhost:27017/netlify');
    return conn;
    
}