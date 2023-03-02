import express, { query } from "express";
import {cnn} from './db/db.js';

const app = express();
app.listen(3000);


app.get('/getData', async (req, res) => {

    const result = await cnn.query('SELECT 1 + 1 AS result');
    res.json(result[0]);

});


console.log('Server Running at port 300');