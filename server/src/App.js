const path = require('path');
process.loadEnvFile(path.join(__dirname, '../.env'));

const express = require('express');
const http = require('http');
const apiRouter = require('./routes/apiRoute');
const viewRouter = require('./routes/viewRoute');
const serverConfig = require('./config/serverConfig');

const PORT = process.env.PORT ?? 3000;
const app = express();

serverConfig(app);

app.use('/api', apiRouter);
app.use('/', viewRouter);

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
