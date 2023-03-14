<script>
  import Swal from "sweetalert2";
  import { updateStock } from "../app.js";

  export let productId;
  $: activeTab = 1;
  $: stock = "";
  $: alertContent = "";

  const isNumber = (val) => !isNaN(val);

  const handleInput = (e) => {
    if (isNumber(e.target.value)) {
      stock = e.target.value;
    }
  };

  const updateInventory = async (type) => {
    if (stock == "") {
      alertContent = "No se ha ingresado la cantidad";
      return;
    }

    alertContent = "";
    updateRequest(type);
  };

  const updateRequest = async (action) => {

    const response = await updateStock(action, productId, stock);
    const { status } = response;

    if(status == 200){
      Swal.fire({
          title: "Stock Actualizado",
          text: `${action == 1 ? 'Entrada' : 'Salida'} registrada correctamente`,
          icon: "success",
          confirmButtonText: "Aceptar",
        }).then((result) => {
          if (result.isConfirmed) {
             
          }
      });
    }

  }
  const initTab = (tab) => {
    activeTab = tab;
    alertContent = "";
    stock = "";
  };
</script>

<div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasInventory">
  <div class="offcanvas-header">
    <h5 class="offcanvas-title text-white">Inventario</h5>
    <button
      type="button"
      class="btn btn-danger"
      style="color: #ffffff; border-radius: 100%; width: 40px; height: 40px; background: #1c1f25 !important; border-color: #1c1f25;"
      data-bs-dismiss="offcanvas"
      aria-label="Close"><i class="bi bi-x-lg"></i></button
    >
  </div>
  <div class="offcanvas-body">
    <ul
      class="nav nav-pills mb-3 d-flex justify-content-center"
      id="pills-tab"
      role="tablist"
    >
      <li class="nav-item rounded-2 w-50" role="presentation">
        <button
          on:click={() => initTab(1)}
          class="nav-link active"
          id="pills-entrances-tab"
          data-bs-toggle="pill"
          data-bs-target="#pills-entrances"
          type="button"
          role="tab"
          aria-controls="pills-entrances"
          aria-selected="true"
          style=" border-radius: 30px"
          ><i class="bi bi-arrow-down-circle-fill" /> Nueva Entrada</button
        >
      </li>
      <li class="nav-item rounded-2 w-50" role="presentation">
        <button
          on:click={() => initTab(2)}
          class="nav-link"
          id="pills-exits-tab"
          data-bs-toggle="pill"
          data-bs-target="#pills-exits"
          type="button"
          role="tab"
          aria-controls="pills-exits"
          aria-selected="false"
          style="border-radius: 30px"
          ><i class="bi bi-arrow-up-circle-fill" /> Nueva Salida</button
        >
      </li>
    </ul>

    <div
      class="tab-content d-flex flex-column justify-content-center"
      id="pills-tabContent"
    >
      <div
        class="tab-pane fade show active"
        id="pills-entrances"
        role="tabpanel"
        aria-labelledby="pills-entrances-tab"
        tabindex="0"
      >
        <div
          class="d-flex flex-column justify-content-center align-items-center mt-4"
        >
          <div
            class="rounded-circle d-flex flex-column justify-content-center align-items-center"
            style="width: 120px; height: 120px; background-color: rgb(28 31 37 / 32%)"
          >
            <img
              src="https://img.icons8.com/fluency/80/delivered-box.png"
              alt=""
            />
          </div>
          <span class="form-text text-sm text-center"
            >Ingresa la cantidad que deseas registrar como entrada.</span
          >
        </div>

        <div
          class="d-flex flex-column justify-content-center align-items-center mt-4"
        >
          <input
            class="form-control w-75 mt-4"
            type="number"
            placeholder="Cantidad"
            bind:value={stock}
            on:input|preventDefault={handleInput}
            minlength="1"
            maxlength="10"
          />
        </div>

        <div
          class="d-flex flex-column justify-content-center align-items-center mt-4"
        >
          <button
            on:click={() => updateInventory(1)}
            class="w-75 btn btn-primary btn-lg mb-4"
            type="button"
            style="background-color: #5865f2; border-color:  #5865f2"
            ><i class="bi bi-arrow-down-circle-fill" /> Registrar Entrada</button
          >

          <div
            class="w-75 alert alert-warning fade {stock == '' &&
            activeTab == 1 &&
            alertContent != ''
              ? 'show'
              : ''}"
            role="alert"
          >
            <small>{alertContent}</small>
          </div>
        </div>
      </div>

      <div
        class="tab-pane fade"
        id="pills-exits"
        role="tabpanel"
        aria-labelledby="pills-exits-tab"
        tabindex="0"
      >
        <div
          class="row d-flex flex-column justify-content-center align-items-center mt-4 mb-4"
        >
          <div
            class="rounded-circle d-flex flex-column justify-content-center align-items-center"
            style="width: 120px; height: 120px; background-color: rgb(28 31 37 / 32%)"
          >
            <img
              src="https://img.icons8.com/fluency/80/remove-delivery.png"
              alt=""
            />
          </div>
          <span class="form-text text-sm text-center"
            >Ingresa la cantidad que deseas registrar como salida.</span
          >
        </div>

        <div
          class="d-flex flex-column justify-content-center align-items-center mt-4"
        >
          <input
            class="form-control w-75 mt-4"
            type="number"
            placeholder="Cantidad"
            bind:value={stock}
            on:input|preventDefault={handleInput}
            minlength="1"
            maxlength="10"
          />
        </div>

        <div
          class="d-flex flex-column justify-content-center align-items-center mt-4"
        >
          <button
            on:click={() => updateInventory(2)}
            class="w-75 btn btn-primary btn-lg mb-4"
            type="button"
            style="background-color: #5865f2; border-color:  #5865f2"
            ><i class="bi bi-arrow-up-circle-fill" /> Registrar Salida</button
          >

          <div
            class="w-75 alert alert-warning fade {stock == '' &&
            activeTab == 2 &&
            alertContent != ''
              ? 'show'
              : ''}"
            role="alert"
          >
            <small>{alertContent}</small>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
