<script>
  import { createEventDispatcher } from "svelte";
  import Swal from "sweetalert2";
  import { addProduct } from "../app";

  const dispatch = createEventDispatcher();
  let product = {
    code: "",
    name: "",
    stock_minimum: "",
  };

  $: alertContent = "";
  $: isShowAlert = alertContent != "" ? "show" : "";

  const isNumber = (val) => !isNaN(val);

  const handleMinimumStock = (e) => {
    if (isNumber(e.target.value)) {
      product.stock_minimum = e.target.value;
    }
  };

  const saveProduct = async () => {
    if (!product.code.trim()) {
      alertContent = "No se ha ingresado el código";
    } else if (!product.name.trim()) {
      alertContent = "No se ha ingresado la descripción";
    } else if (product.stock_minimum == "") {
      alertContent = "No se ha ingresado la cantidad mínima";
    } else if (product.stock_minimum == 0) {
      alertContent = "La cantidad debe ser mayor a 0";
    } else {
      alertContent = "";
      const response = await addProduct(product);
      const { status } = response;

      if (status == 200) {
        Swal.fire({
          title: "Producto Agregado",
          text: "El producto ha sido agregado con éxito",
          icon: "success",
          confirmButtonText: "Aceptar",
          allowOutsideClick: false,
        }).then((result) => {
          if (result.isConfirmed) {
            dispatch("getInventary");
            const event = new Event("click");
            document.querySelector("#btnCloseNewProduct").dispatchEvent(event);
            product.code = "";
            product.name = "";
            product.stock_minimum = "";
          }
        });
      }
    }
  };
</script>

<div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasNewProduct">
  <div class="offcanvas-header">
    <h5 class="offcanvas-title text-white">Registrar Producto</h5>

    <button
      id="btnCloseNewProduct"
      type="button"
      class="btn btn-danger"
      style="color: #ffffff; border-radius: 100%; width: 40px; height: 40px; 
      background: #1c1f25 !important;
      border-color: #1c1f25;"
      data-bs-dismiss="offcanvas"
      aria-label="Close"><i class="bi bi-x-lg" /></button
    >
  </div>
  <div class="offcanvas-body">
    <div
      class="d-flex flex-column justify-content-center align-items-center mt-2"
    >
      <div
        class="rounded-circle d-flex flex-column justify-content-center align-items-center"
        style="width: 120px; height: 120px; background-color: rgb(28 31 37 / 32%)"
      >
        <img src="https://img.icons8.com/fluency/80/box.png" alt="" />
      </div>
      <span class="form-text text-sm text-center mt-3"
        >Ingresa la información del producto.</span
      >
    </div>

    <div class="d-flex flex-column justify-content-center align-items-center">
      <!-- svelte-ignore a11y-autofocus -->
      <input
        autofocus="true"
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
        placeholder="Nombre del Producto"
        bind:value={product.name}
      />
    </div>
    <div class="d-flex flex-column justify-content-center align-items-center">
      <input
        class="form-control w-75 mt-3"
        type="number"
        placeholder="Cantidad Mínima"
        bind:value={product.stock_minimum}
        on:input|preventDefault={handleMinimumStock}
        minlength="1"
      />
      <span class="form-text" style="font-size: 10px;"
        >Cantidad mínima que debe tener el producto en el inventario.</span
      >
    </div>

    <div
      class="d-flex flex-column justify-content-center align-items-center mt-4"
    >
      <button
        class="w-75 btn btn-primary btn-lg mb-4"
        type="button"
        style="background-color: #5865f2; border-color:  #5865f2"
        on:click={() => saveProduct()}
        ><i class="bi bi-check-circle-fill" /> Registrar Producto</button
      >

      <div class="w-75 alert alert-danger fade {isShowAlert}" role="alert">
        <small>{alertContent}</small>
      </div>
    </div>
  </div>
</div>
