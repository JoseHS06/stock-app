<script>
  import { Toast } from "bootstrap";
  import { onMount } from "svelte";
  import { getProducts } from "./app";
  import Header from "./components/Header.svelte";
  import Product from "./components/Product.svelte";
  import AddInventory from "./components/Add-Inventory.svelte";
  import Pagination from "./components/Pagination.svelte";
  import NotFound from "./components/Not-Found.svelte";
  import InputList from "./components/Input-List.svelte";
  import OutputList from "./components/Output-List.svelte";
  import Datatable from "./components/datatable.svelte";

  let currentProducts = [];
  let filteredProducts = [];

  let page = 0;
  let totalPages = [];
  let currentPageRows = [];
  let itemsPerPage = 12;
  let productId = 0;

  $: currentPageRows = totalPages.length > 0 ? totalPages[page] : [];
  $: disabledLast = page + 1 == totalPages.length ? "disabled" : "";
  $: disabledFirst = page + 1 == 1 ? "disabled" : "";

  onMount(async () => {
    currentProducts = await getProducts();
    filteredProducts = await getProducts();
    paginate(filteredProducts);
  });

  const searchProduct = (e) => {
    const word = e.target.value.toLowerCase();

    if (word == "") {
      filteredProducts = [...currentProducts];
      paginate(filteredProducts);
      return;
    }

    const results = currentProducts.filter(
      ({ name }) => name.toLowerCase().indexOf(word) > -1
    );

    filteredProducts = [...results];
    page = 0;
    totalPages = [];
    paginate(filteredProducts);
  };

  const paginate = (items) => {
    const pages = Math.ceil(items.length / itemsPerPage);

    const paginatedItems = Array.from({ length: pages }, (_, index) => {
      const start = index * itemsPerPage;
      return items.slice(start, start + itemsPerPage);
    });

    totalPages = [...paginatedItems];
  };

  const setPage = (p) => {
    if (p >= 0 && p < totalPages.length) {
      page = p;
    }
  };

  const updateStock = (e) => {
    const { id } = e.detail;
    productId = id;
  };

</script>

<main class="container">
  <Header on:input={searchProduct} />
  <div class="col-12">
    <div class="row">
      {#each currentPageRows as { id, name, stock }, index}
        <Product {id} {name} {stock} on:updateInventory={updateStock} />
      {/each}
    </div>
  </div>
  <NotFound {currentPageRows} />
  <Pagination {page} {totalPages} {disabledLast} {disabledFirst} {setPage} />
  <AddInventory {productId} />
  <InputList/>
  <OutputList/>
  <Datatable/>
</main>
