'use strict';

const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../config').JWT_SECRET;

module.exports = async function(req, res, next) {
  try {
    const authToken = req.header('x-auth');
    if (!authToken) return res.status(404).send({ msg: 'AuthToken not found' });

    const decodedValue = jwt.verify(authToken, JWT_SECRET);
    if (!decodedValue) return res.status(401).send({ msg: 'Invalid Authentication' });

    req.userId = decodedValue.userId;
    next();
  } catch {
    res.status(401).send({ msg: 'Invalid Authentication' });
  }
};
