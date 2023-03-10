import { createPool } from 'mysql2/promise';

export const conexion = createPool({
    host: 'localhost',
    user: 'root',
    password: 'armando-root',
    port: 3306,
    database: 'stock_app',
    charset: 'utf8mb4',
});