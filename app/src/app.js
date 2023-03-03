

const getProducts = async () => {
    try {
        const response = await fetch("/api.json").then((res) => res.json());
        const { products } = await response;

        return products;
    } catch (error) {
        console.warn("Ocurrió un error al obtener los productos.");
    }
};

const addProduct = async (product) => {
    try {
        const {code, name, stock} = product;
        const response = await fetch("http://localhost/addProduct", {
            method: "POST",
            headers: {
                "Content-type": "application/json; charset=UTF-8",
            },
            body: JSON.stringify({
                code,
                name, 
                stock,
            }),
        }).then((res) => res.json());

        const { data, status } = await response;

        console.log(data);
    } catch (error) { }
};

const addStock = async () => {
    try {
        const response = await fetch("http://localhost/addStock", {
            method: "POST",
            headers: {
                "Content-type": "application/json; charset=UTF-8",
            },
            body: JSON.stringify({
                id: "",
                stock: "",
            }),
        }).then((res) => res.json());

        const { data, status } = await response;

        console.log(data);
    } catch (error) { }
};

const removeStock = async () => {
    try {
        const response = await fetch("http://localhost/removeStock", {
            method: "POST",
            headers: {
                "Content-type": "application/json; charset=UTF-8",
            },
            body: JSON.stringify({
                id: "",
                stock: "",
            }),
        }).then((res) => res.json());

        const { data, status } = await response;

        console.log(data);
    } catch (error) { }
};

export { getProducts, addProduct, addStock, removeStock }