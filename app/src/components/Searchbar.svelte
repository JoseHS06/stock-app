<script>
    let search = '';
</script>

<div class="row mt-4">
  <div class="col-6">
    <div class="mb-3">
      <div class="input-group">
        <span class="input-group-text"><i class="bi bi-search" /></span>
        <input
          type="text"
          class="form-control form-control-lg"
          placeholder="Buscar Producto"
          bind:value={search}
          on:input
        />
      </div>
      <div class="form-text">Ingresa o escanea el código del producto</div>
    </div>
  </div>
  <div class="col-6">
    <div class="mb-3 d-flex justify-content-end">
      <button
        type="button"
        class="btn btn-lg btn-primary"
        style="background-color: #44bd32; border-color:  #44bd32"
        data-bs-toggle="offcanvas"
        data-bs-target="#offcanvasNewProduct"
        ><i class="bi bi-plus-circle-fill" /> Agregar Producto</button
      >
    </div>
  </div>
</div>
