<script>
  import { addProduct } from "../app";

  let product = {
    code: "",
    name: "",
    stock: 0,
  };

  const saveProduct = async () => {

    if(!product.code.trim()){
      console.log("Agrega el código del Producto.");
    }else if (!product.name.trim()) {
      console.log("Agrega la descripción del Producto.");
    } else if (product.stock == 0) {
      console.log("Agrega el stock del product0");
    }else{

      const response = await addProduct(product);
      const { data, status } = response;

    }

  };
</script>

<div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasNewProduct">
  <div class="offcanvas-header">
    <h5 class="offcanvas-title">Registrar Producto</h5>
    <button
      type="button"
      class="btn-close"
      data-bs-dismiss="offcanvas"
      aria-label="Close"
    />
  </div>
  <div class="offcanvas-body">
    <div
      class="row d-flex flex-column justify-content-center align-items-center mt-4 mb-4"
    >
      <div
        class="rounded-circle d-flex flex-column justify-content-center align-items-center"
        style="width: 120px; height: 120px; background-color: rgb(19 15 64 / 5%)"
      >
        <img src="https://img.icons8.com/fluency/80/box.png" alt="" />
      </div>
      <span class="form-text text-sm text-center"
        >Ingresa la información del producto.</span
      >
    </div>

    <div
      class="row d-flex flex-column justify-content-center align-items-center"
    >
      <input class="form-control w-75 mt-4" type="text" placeholder="Código" bind:value={product.code}/>
    </div>
    <div
      class="row d-flex flex-column justify-content-center align-items-center"
    >
      <textarea
        class="form-control w-75 mt-4"
        type="text"
        placeholder="Descripción"
        bind:value={product.name}
      />
    </div>
    <div
      class="row d-flex flex-column justify-content-center align-items-center"
    >
      <input
        class="form-control w-75 mt-4"
        type="text"
        placeholder="Cantidad"
        bind:value={product.stock}
      />
    </div>

    <div
      class="row d-flex flex-column justify-content-center align-items-center h-25"
    >
      <button
        class="w-75 btn btn-primary btn-lg"
        type="button"
        style="background-color: #130f40; border-color:  #130f40"
        on:click={saveProduct}
        ><i class="bi bi-check-circle-fill" /> Registrar Producto</button
      >
    </div>
  </div>
</div>
