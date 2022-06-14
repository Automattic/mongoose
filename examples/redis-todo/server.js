'use strict';

const http = require('http');
const express = require('express');
const rateLimit = require('express-rate-limit');

// DB
require('./db');
require('./services/cache');

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100
});

const app = express();
app.use(express.json());

app.use(limiter);

// morgan test
app.use(require('morgan')('dev'));

// ROUTERS
app.use('/user', require('./routers/userRouter'));
app.use('/todo', require('./routers/todoRouter'));

// Server setup
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server up at PORT:${PORT}`);
});
