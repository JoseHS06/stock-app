const getProducts = async () => {
<<<<<<< Updated upstream
  try {
    return new Promise((resolve, reject) => {
      fetch("http://localhost:3000/getLog/0", {
        method: "GET",
        headers: {
          "Content-type": "application/json; charset=UTF-8",
          "Access-Control-Allow-Origin": "*",
        },
      })
        .then((response) => response.json())
        .then(resolve)
        .catch(reject);
    });
  } catch (error) {
    console.warn("Ocurrió un error al registrar el producto " + error);
  }
};

const getInventary = async () => {
  try {
    return new Promise((resolve, reject) => {
        fetch("http://localhost:3000/getLog/1", {
          method: "GET",
          headers: {
            "Content-type": "application/json; charset=UTF-8",
            "Access-Control-Allow-Origin": "*",
          },
        })
          .then((response) => response.json())
          .then(resolve)
          .catch(reject);
      });
  } catch (error) {
    console.warn("Ocurrió un error al obtener los productos " + error);
  }
};



=======
    try {

        return new Promise((resolve, reject) =>{
            fetch("http://localhost:3000/getLog/0", {
            method: "GET",
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "Access-Control-Allow-Origin": '*',
            }
           }).then((response) => response.json())
              .then((resolve))
              .catch((reject));
        });

    } catch (error) {
        console.warn('Ocurrió un error al obtener los productos' + error);
    }
};


const getInventary = async () => {
    try {

        return new Promise((resolve, reject) =>{
            fetch("http://localhost:3000/getLog/1", {
            method: "GET",
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "Access-Control-Allow-Origin": '*',
            }
           }).then((response) => response.json())
              .then((resolve))
              .catch((reject));
        });

    } catch (error) {
        console.warn('Ocurrió un error al obtener los productos ' + error);
    }
};

>>>>>>> Stashed changes
const addProduct = async (product) => {
  try {
    const { code, name, stock, stock_minimum } = product;
    const response = await fetch("http://localhost:3000/addProduct", {
      method: "POST",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        code,
        name,
        stock,
        stock_minimum,
      }),
    }).then((res) => res.json());

    const { status } = response;

<<<<<<< Updated upstream
    if (status == 200) {
      return {
        status,
        message: "Producto agregado con éxito",
      };
    }
  } catch (error) {
    console.warn("Ocurrió un error al obtener el inventario " + error);
  }
=======
        if(status == 200){
            
            return {
                status,
                message: 'Producto agregado con éxito'
            };
        }

        
    } catch (error) {
        console.warn('Ocurrió un error al registrar el producto ' + error);
     }
>>>>>>> Stashed changes
};

const updateStock = async (action, id, stock) => {
  try {
    const response = await fetch("http://localhost:3000/updateStock", {
      method: "POST",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        action,
        id,
        stock,
      }),
    }).then((res) => res.json());

    const { status } = response;

    if (status == 200) {
      return {
        status,
        message: "Stock actualizado con éxito",
      };
    }
  } catch (error) {
    console.warn("Ocurrió un error al actualizar el stock" + error);
  }
};

<<<<<<< Updated upstream
export { getProducts, getInventary, addProduct, updateStock };
=======


export { getProducts, getInventary, addProduct, updateStock}
>>>>>>> Stashed changes
