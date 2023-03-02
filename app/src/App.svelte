<script>
  import { onMount } from "svelte";
  import Header from "./components/Header.svelte";
  import Product from "./components/Product.svelte";
  import AddInventory from "./components/Add-Inventory.svelte";
  import AddProduct from "./components/Add-Product.svelte";

  
  let currentProducts = [];
  let filteredProducts = [];


  onMount(async() =>{
      getProducts();
  })

  const getProducts = async () => {

      try {

          const response = await fetch('/api.json').then((res) => res.json());
          const { products }  = await response;
          currentProducts = [...products];
          filteredProducts = [...products];
          
      } catch (error) {

          console.warn('Ocurrió un error al obtener los productos.')
          
      }
  }

  const searchProduct = (e) => {

      const word = e.target.value.toLowerCase();

      if(word == ''){
        filteredProducts = [...currentProducts];
        return; 
      }

      const results = currentProducts.filter(({ name }) => name.toLowerCase().indexOf(word) > -1);

      filteredProducts = [...results];

  }


  const addProduct = async () => {
      
      try {

          const response = await fetch('http://localhost/addProduct' ,{
              method: 'POST',
              headers: { 
          "Content-type": "application/json; charset=UTF-8"
        },
              body: JSON.stringify({
                  name: '',
                  stock: ''
              }),
          
          }).then((res) => res.json());

          const { data, status } = await response;

          console.log(data);

          
      } catch (error) {
          
      }
  }

  const addStock = async () => {
      
      try {

          const response = await fetch('http://localhost/addStock' ,{
              method: 'POST',
              headers: { 
          "Content-type": "application/json; charset=UTF-8"
        },
              body: JSON.stringify({
                  id: '',
                  stock: ''
              }),
          
          }).then((res) => res.json());

          const { data, status } = await response;

          console.log(data);

          
      } catch (error) {
          
      }
  }

  const removeStock = async () => {
      
      try {

          const response = await fetch('http://localhost/removeStock' ,{
              method: 'POST',
              headers: { 
          "Content-type": "application/json; charset=UTF-8"
        },
              body: JSON.stringify({
                  id: '',
                  stock: ''
              }),
          
          }).then((res) => res.json());

          const { data, status } = await response;

          console.log(data);

          
      } catch (error) {
          
      }
  }


</script>

<main class="container">
  <Header on:input={searchProduct} />

  <div class="col-12">
    <div class="row">
      {#each filteredProducts as { name, stock }, index}
        <Product {name} {stock} />
      {/each}
    </div>
  </div>

  <AddInventory />
  <AddProduct />
</main>
