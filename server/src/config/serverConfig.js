const express = require('express');
const morgan = require('morgan');
const path = require('path');
const removeXPoweredHeader = require('../middleware/removeHeader');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { getCorsOrigins } = require('./corsOrigins');

const corsOptions = {
  origin: getCorsOrigins(),
  credentials: true,
};

const serverConfig = (app) => {
  app.use(cors(corsOptions));
  app.use(morgan('dev'));
  app.use(cookieParser());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(removeXPoweredHeader);
  app.use(express.static(path.join(__dirname, '../../public')));
};

module.exports = serverConfig;
