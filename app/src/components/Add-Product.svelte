<script>
  import { addProduct } from "../app";

  let product = {
    code: "",
    name: "",
    stock: 0,
  };

  $: alertContent = "";
  $: isShowAlert = alertContent != "" ? "show" : "";

  const saveProduct = async () => {
    if (!product.code.trim()) {
      alertContent = "No se ha ingresado el código";
    } else if (!product.name.trim()) {
      alertContent = "No se ha ingresado la descripción";
    } else if (product.stock == 0) {
      alertContent = "No se ha ingresado la cantidad";
    } else {
      alertContent = "";
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
      class="d-flex flex-column justify-content-center align-items-center mt-2"
    >
      <div
        class="rounded-circle d-flex flex-column justify-content-center align-items-center"
        style="width: 120px; height: 120px; background-color: rgb(19 15 64 / 5%)"
      >
        <img src="https://img.icons8.com/fluency/80/box.png" alt="" />
      </div>
      <span class="form-text text-sm text-center mt-3"
        >Ingresa la información del producto.</span
      >
    </div>

    <div class="d-flex flex-column justify-content-center align-items-center">
      <input
        class="form-control w-75 mt-3"
        type="text"
        placeholder="Código"
        bind:value={product.code}
      />
    </div>
    <div class="d-flex flex-column justify-content-center align-items-center">
      <textarea
        class="form-control w-75 mt-3"
        type="text"
        placeholder="Descripción"
        bind:value={product.name}
      />
    </div>
    <div class="d-flex flex-column justify-content-center align-items-center">
      <input
        class="form-control w-75 mt-3"
        type="text"
        placeholder="Cantidad"
        bind:value={product.stock}
      />
    </div>

    <div
      class="d-flex flex-column justify-content-center align-items-center mt-3"
    >
      <button
        class="w-75 btn btn-primary btn-lg mb-4"
        type="button"
        style="background-color: #130f40; border-color:  #130f40"
        on:click={() => saveProduct()}
        ><i class="bi bi-check-circle-fill" /> Registrar Producto</button
      >

      <div class="w-75 alert alert-danger fade {isShowAlert}" role="alert">
        <small>{alertContent}</small>
      </div>
    </div>
  </div>
</div>
