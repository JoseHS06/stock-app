<script>
  import { productList } from "./js/products.js";
</script>

<!-- Product List -->
<div class="row mt-4">
  <div class="col-6">
    <div class="mb-3">
      <div class="input-group">
        <span class="input-group-text"><i class="bi bi-search" /></span>
        <input
          type="text"
          class="form-control form-control-lg"
          placeholder="Buscar Producto"
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

<div class="col-12">
  <div class="row">
    {#each productList as { name, stock }, index}
      <div class="col-4 mt-4">
        <div class="card">
          <div class="card-body">
            <h6 class="card-title">{(index + 1)} {name}</h6>
            <p class="card-text text-muted">{stock}</p>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- Product List -->
