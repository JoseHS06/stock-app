<script>
  import { onMount } from "svelte";
  import Header from "./components/Header.svelte";
  import Product from "./components/Product.svelte";
  import AddInventory from "./components/Add-Inventory.svelte";
  import AddProduct from "./components/Add-Product.svelte";

  let currentProducts = [];
  let filteredProducts = [];

  let rows = [];
  let page = 0;
  let totalPages = [];
  let currentPageRows = [];
  let itemsPerPage = 10;
  let isLoading = true;

  $: currentPageRows = totalPages.length > 0 ? totalPages[page] : [];
  $: console.log("Page is", page);

  onMount(async () => {
    getProducts();
  });

  const getProducts = async () => {
    try {
      const response = await fetch("/api.json").then((res) => res.json());
      const { products } = await response;
      currentProducts = [...products];
      filteredProducts = [...products];
      paginate(filteredProducts);
    } catch (error) {
      console.warn("Ocurrió un error al obtener los productos.");
    }
  };

  const searchProduct = (e) => {
    const word = e.target.value.toLowerCase();

    if (word == "") {
      filteredProducts = [...currentProducts];
      return;
    }

    const results = currentProducts.filter(
      ({ name }) => name.toLowerCase().indexOf(word) > -1
    );

    filteredProducts = [...results];
  };

  const paginate = (items) => {
    const pages = Math.ceil(items.length / itemsPerPage);

    const paginatedItems = Array.from({ length: pages }, (_, index) => {
      const start = index * itemsPerPage;
      return items.slice(start, start + itemsPerPage);
    });

    console.log("paginatedItems are", paginatedItems);
    totalPages = [...paginatedItems];
  };

  const setPage = (p) => {
    if (p >= 0 && p < totalPages.length) {
      page = p;
    }
  };

  const addProduct = async () => {
    try {
      const response = await fetch("http://localhost/addProduct", {
        method: "POST",
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          name: "",
          stock: "",
        }),
      }).then((res) => res.json());

      const { data, status } = await response;

      console.log(data);
    } catch (error) {}
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
    } catch (error) {}
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
    } catch (error) {}
  };
</script>

<main class="container">
  <Header on:input={searchProduct} />

  <div class="col-12">
    <div class="row">
      {#each currentPageRows as { name, stock }, index}
        <Product {name} {stock} />
      {/each}
    </div>
  </div>

  <nav class="pagination">
    <ul>
      <li>
        <button
          type="button"
          class="btn-next-prev"
          on:click={() => setPage(page - 1)}
        >
          PREV
        </button>
      </li>

      {#each totalPages as page, i}
        <li>
          <button
            type="button"
            class="btn-page-number"
            on:click={() => setPage(i)}
          >
            {i + 1}
          </button>
        </li>
      {/each}

      <li>
        <button
          type="button"
          class="btn-next-prev"
          on:click={() => setPage(page + 1)}
        >
          NEXT
        </button>
      </li>
    </ul>
  </nav>

  <AddInventory />
  <AddProduct />
</main>
