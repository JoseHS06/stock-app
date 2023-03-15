const getProducts = async () => {
  try {
    return new Promise((resolve, reject) => {
      fetch("https://stock-app-api-production-e92f.up.railway.app/getLog/0", {
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
        fetch("https://stock-app-api-production-e92f.up.railway.app/getLog/1", {
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



const addProduct = async (product) => {
  try {
    const { code, name, stock, stock_minimum } = product;
    const response = await fetch("https://stock-app-api-production-e92f.up.railway.app/addProduct", {
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

    if (status == 200) {
      return {
        status,
        message: "Producto agregado con éxito",
      };
    }
  } catch (error) {
    console.warn("Ocurrió un error al obtener el inventario " + error);
  }
};

const updateStock = async (action, id, stock) => {
  try {
    const response = await fetch("https://stock-app-api-production-e92f.up.railway.app/updateStock", {
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

    const { status, message } = response;

    return {
      status,
      message
    };

  } catch (error) {
    console.warn("Ocurrió un error al actualizar el stock" + error);
  }
};

const deleteItem = async (action, id) => {
  try {
    const response = await fetch("https://stock-app-api-production-e92f.up.railway.app/deleteItem", {
      method: "POST",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        id,
        action
      }),
    }).then((res) => res.json());

    const { status, message } = response;

    return {
      status,
      message
    };

  } catch (error) {
    console.warn("Ocurrió un error al actualizar el stock" + error);
  }
};

export { getProducts, getInventary, addProduct, updateStock, deleteItem };
