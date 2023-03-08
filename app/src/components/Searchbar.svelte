<script>
    import AddProduct from "./Add-Product.svelte";
    let search = '';
</script>

<div class="row mt-4">
  <div class="col-lg-5 col-sm-12">
    <div class="mb-3">
      <div class="input-group">
        <span class="input-group-text"><i class="bi bi-search" /></span>
        <input
          type="text"
          class="form-control form-control-lg"
          placeholder="Buscar Producto..."
          bind:value={search}
          on:input
        />
      </div>
      <div class="form-text">Ingresa o escanea el código del producto</div>
    </div>
  </div>
  <div class="col-lg-7 col-sm-12">
    <div class="mb-3 d-flex justify-content-end">
      <button
        type="button"
        class="btn btn-lg btn-primary shadow-sm"
        style="background-color: #1c1f25; border-color:  #1c1f25; color: #FFFFFF"
        data-bs-toggle="offcanvas" 
        data-bs-target="#offcanvasInputs"
        ><i class="bi bi-arrow-down-circle-fill"></i> Entradas</button
      >
      <button
        type="button"
        class="btn btn-lg btn-primary mx-2 shadow-sm"
        style="background-color: #1c1f25; border-color:  #1c1f25; color: #FFFFFF"
        data-bs-toggle="offcanvas"
        data-bs-target="#offcanvasOutputs"
        ><i class="bi bi-arrow-up-circle-fill"></i> Salidas</button
      >
      <button
        type="button"
        class="btn btn-lg btn-primary shadow-sm"
        style="background-color: #1c1f25; border-color:  #1c1f25; color: #FFFFFF"
        data-bs-toggle="offcanvas"
        data-bs-target="#offcanvasNewProduct"
        ><i class="bi bi-plus-circle-fill"></i> Nuevo Producto</button
      >
    </div>
  </div>
</div>


<AddProduct/>