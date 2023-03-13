import express from "express";
import bodyParser from "body-parser";
import cors from 'cors';
import { conexion } from './db/db.js';

const app = express();
app.listen(3000);
app.use(bodyParser.json());
app.use(cors({origin: '*'}));

app.get('/getLog/:action', async (req, res) =>{

    try {

         const { action } = req.params
         const [rows] = await conexion.query('CALL listStock(?)', [action]);

         return res.status(200).json({ message: 'Log obtenido correctamente', status: 200, data: rows[0] });
        
    } catch (error) {

        return res.status(300).json({ message: 'Ocurrió un error al obtener el log ' + error });
        
    }

});

app.post('/addProduct', async (req, res) => {

    try {

        const { code, name, stock_minimum } = req.body;
        const result = await conexion.query('CALL newItem(?, ?, ?)', [code, name, stock_minimum]);

        return res.status(200).json({ message: 'Producto agregado correctamente', status: 200});

    } catch (error) {

        return res.status(300).json({ message: 'Ocurrió un error al agregar al producto' + error });

    }
});

app.post('/updateStock', async (req, res) => {

    try {

        const { action, id, stock } = req.body;
        const [rows] = await conexion.query('CALL itemAction(?, ?, ?)', [action, id, stock]);

        return res.status(200).json({ message: 'Stock actualizado correctamente', data: rows });

    } catch (error) {

        return res.status(300).json({ message: 'Ocurrió un error al agregar el stock', status: 200 });

    }
});


console.log('Server Running at port 300');