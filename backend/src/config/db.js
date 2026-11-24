import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

console.log('Database environment check:', {
    DB_HOST: !!process.env.DB_HOST,
    DB_PORT: !!process.env.DB_PORT,
    DB_USER: !!process.env.DB_USER,
    DB_PASSWORD: !!process.env.DB_PASSWORD,
    DB_NAME: !!process.env.DB_NAME,
    target: `${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME}`
});

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true // Required for running schema.sql
});

export default pool;
