import { createPool } from 'mysql2/promise';

export const conexion = createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    database: 'stock',
    charset: 'utf8mb4',
    debug: true,
});