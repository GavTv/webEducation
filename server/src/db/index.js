const { Sequelize } = require('sequelize');
const path = require('path');
process.loadEnvFile(path.join(__dirname, '../../.env'));

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

module.exports = sequelize;
