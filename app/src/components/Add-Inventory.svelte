<script>
  export let productId;
  let stock = 0;

  const updateInventory = (type) => {
    console.log({type, productId, stock})
  }
  
</script>

<div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasInventory">
  <div class="offcanvas-header">
    <h5 class="offcanvas-title">Inventario</h5>
    <button
      type="button"
      class="btn-close"
      data-bs-dismiss="offcanvas"
      aria-label="Close"
    />
  </div>
  <div class="offcanvas-body">
    <ul
      class="nav nav-pills mb-3 d-flex justify-content-center"
      id="pills-tab"
      role="tablist"
    >
      <li class="nav-item rounded-2 w-50" role="presentation">
        <button
          class="nav-link active"
          id="pills-entrances-tab"
          data-bs-toggle="pill"
          data-bs-target="#pills-entrances"
          type="button"
          role="tab"
          aria-controls="pills-entrances"
          aria-selected="true"
          style=" border-radius: 30px"
          ><i class="bi bi-arrow-down-circle-fill" /> Registrar Entrada</button
        >
      </li>
      <li class="nav-item rounded-2 w-50" role="presentation">
        <button
          class="nav-link"
          id="pills-exits-tab"
          data-bs-toggle="pill"
          data-bs-target="#pills-exits"
          type="button"
          role="tab"
          aria-controls="pills-exits"
          aria-selected="false"
          style="border-radius: 30px"
          ><i class="bi bi-arrow-up-circle-fill" /> Registrar Salida</button
        >
      </li>
    </ul>

    <div
      class="tab-content d-flex flex-column justify-content-center"
      id="pills-tabContent"
      style="height: 50vh"
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
            style="width: 120px; height: 120px; background-color: rgb(19 15 64 / 5%)"
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
            type="text"
            placeholder="Cantidad"
            bind:value={stock}
          />
        </div>

        <div
          class="row d-flex flex-column justify-content-center align-items-center h-50"
        >
          <button
            on:click={() => updateInventory('add')}
            class="w-75 btn btn-primary btn-lg"
            type="button"
            style="background-color: #130f40; border-color:  #130f40"
            ><i class="bi bi-arrow-down-circle-fill" /> Registrar Entrada</button
          >
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
            style="width: 120px; height: 120px; background-color: rgb(19 15 64 / 5%)"
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
            type="text"
            placeholder="Cantidad"
            bind:value={stock}
          />
        </div>

        <div
          class="row d-flex flex-column justify-content-center align-items-center h-50"
        >
          <button
            on:click={() => updateInventory('remove')}
            class="w-75 btn btn-primary btn-lg"
            type="button"
            style="background-color: #130f40; border-color:  #130f40"
            ><i class="bi bi-arrow-up-circle-fill" /> Registrar Salida</button
          >
        </div>
      </div>
    </div>
  </div>
</div>
