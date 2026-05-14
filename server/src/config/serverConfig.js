const express = require('express');
const morgan = require('morgan');
const path = require('path');
const removeXPoweredHeader = require('../middleware/removeHeader');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const corsOptions = {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
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
