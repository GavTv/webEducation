const path = require('path');
require('./utils/loadEnv')();

const express = require('express');
const http = require('http');
const apiRouter = require('./routes/apiRoute');
const viewRouter = require('./routes/viewRoute');
const serverConfig = require('./config/serverConfig');
const initChatSocket = require('./ws/chatSocket');

const PORT = process.env.PORT ?? 3000;
const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

serverConfig(app);

app.use('/api', apiRouter);
app.use('/', viewRouter);

const server = http.createServer(app);
initChatSocket(server);

server.listen(PORT, () => {
});
