import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'aris',
  password: process.env.DB_PASSWORD || 'aris@022805',
  database: process.env.DB_NAME || 'drone_mapping_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
