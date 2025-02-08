const mysql = require('mysql')
const dotenv = require('dotenv')
dotenv.config({ path: './.env' });
console.log(process.env.host)
const dbConfig = {
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
    connectionLimit: 10,
  };
  
  const pool = mysql.createPool(dbConfig);
  
  pool.on('connection', (connection) => {
    console.log('New connection established with ID:', connection.threadId);
  });
  
  pool.on('acquire', (connection) => {
    console.log('Connection %d acquired', connection.threadId);
  });
  
  pool.on('release', (connection) => {
    console.log('Connection %d released', connection.threadId);
  });
  
  pool.on('error', (err) => {
    console.error('MySQL error: ', err);
  });
  
  function handleDisconnect() {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error('Error getting connection: ', err);
        setTimeout(handleDisconnect, 2000);
      } else {
        connection.release();
        console.log('MySQL connected');
      }
    });
  }
  
  handleDisconnect();

  module.exports = pool;
