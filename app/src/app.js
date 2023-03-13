
const getProducts = async () => {
    try {
   
        const response = await fetch("http://localhost:3000/getLog/0", {
            method: "GET",
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "Access-Control-Allow-Origin": '*',
            }
        }).then((res) => res.json());

        const { status, data } = response;

        if(status == 200){

            return {
                status,
                message: 'Listado de productos obtenido con éxito',
                data
            }
        }

    } catch (error) {
        console.warn('Ocurrió un error al registrar el producto ' + error);
     }
};


const getInputs = async () => {
    try {
   
        const response = await fetch("http://localhost:3000/getLog/1", {
            method: "GET",
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "Access-Control-Allow-Origin": '*',
            }
        }).then((res) => res.json());

        const { status } = response;

        if(status == 200) {
            return {
                status: 200,
                message: 'Listado de entradas obtenido con éxito'
            }
        }

    } catch (error) {
        console.warn('Ocurrió un error al registrar el producto ' + error);
     }
};

const getOutputs = async () => {
    try {
   
        const response = await fetch("http://localhost:3000/getLog/1", {
            method: "GET",
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "Access-Control-Allow-Origin": '*',
            }
        }).then((res) => res.json());

        const { status } = response;

        console.log(status);
    } catch (error) {
        console.warn('Ocurrió un error al registrar el producto ' + error);
     }
};


const addProduct = async (product) => {
    try {
        const {code, name, stock, stock_minimum} = product;
        const response = await fetch("http://localhost:3000/addProduct", {
            method: "POST",
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "Access-Control-Allow-Origin": '*',
            },
            body: JSON.stringify({
                code,
                name, 
                stock,
                stock_minimum
            }),
        }).then((res) => res.json());

        const { status } = response;

        if(status == 200){
            
            return {
                status: 200,
                message: 'Producto agregado con éxito'
            };
        }

        
    } catch (error) {
        console.warn('Ocurrió un error al registrar el producto ' + error);
     }
};

const updateStock = async (action, id, stock) => {
    try {
        const response = await fetch("http://localhost:3000/updateStock", {
            method: "POST",
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "Access-Control-Allow-Origin": '*',
            },
            body: JSON.stringify({
                action,
                id,
                stock,
            }),
        }).then((res) => res.json());

        const { status } = response;

        if(status == 200){

            return {
                status,
                message: 'Stock actualizado con éxito'
            }
        }

    } catch (error) { 
        console.warn('Ocurrió un error al actualizar el stock' + error);
    }
};



export { getProducts, addProduct, updateStock, getInputs, getOutputs}