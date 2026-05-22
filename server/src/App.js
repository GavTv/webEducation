const path = require('path');
require('./utils/loadEnv')();

const express = require('express');
const http = require('http');
const apiRouter = require('./routes/apiRoute');
const viewRouter = require('./routes/viewRoute');
const serverConfig = require('./config/serverConfig');
const initChatSocket = require('./ws/chatSocket');
const { ensureMockAdmin } = require('./utils/ensureMockAdmin');

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

async function startServer() {
  try {
    await ensureMockAdmin();
  } catch (error) {
    console.error('[ensureMockAdmin] не удалось создать мок-админа:', error);
  }

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

void startServer();
