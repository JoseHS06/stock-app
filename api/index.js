import express, { query } from "express";
import { conexion } from './db/db.js';

const app = express();
app.listen(3000);


app.get('/addProduct', async (req, res) => {

    try {

        const { code, name, stock } = req.body;
        const [rows] = await conexion.query('', [code, name, stock]);

        return res.status(200).json({ message: 'Producto agregado correctamente ' });

    } catch (error) {

        return res.status(300).json({ message: 'Ocurrió un error al agregar al producto' });

    }
});

app.get('/addStock', async (req, res) => {

    try {

        const { id, stock } = req.body;
        const [rows] = await conexion.query('', [id, stock]);

        return res.status(200).json({ message: 'Stock actualizado correctamente ' });

    } catch (error) {

        return res.status(300).json({ message: 'Ocurrió un error al agregar el stock' });

    }
});

app.get('/removeStock', async (req, res) => {

    try {

        const { id, stock } = req.body;
        const [rows] = await conexion.query('', [id, stock]);

        return res.status(200).json({ message: 'Stock actualizado correctamente ' });

    } catch (error) {

        return res.status(300).json({ message: 'Ocurrió un error al eliminar el stock' });

    }
});


console.log('Server Running at port 300');