<script>
  import { onMount } from "svelte";
  import { getInventary, getProducts } from "../app.js";
  import InputList from "./Input-List.svelte";
  import OutputList from "./Output-List.svelte";
  import ProductReport from "./Product-Report.svelte";
  let search = "";
  let inputs = [];
  let outputs = [];
  let inventary = [];

  onMount(async () => {

    getInventaryData();
    getInventoryReport();

    
  });

  const getInventaryData = async() => {

    const { status, data } = await getInventary();

    if(status == 200){
      inputs = [...data.filter(input => input.action == 1)];
      outputs = [...data.filter(input => input.action == 2)];
    }

  }

  const getInventoryReport = async () => {

    const { status, data } = await getProducts();
    if (status == 200) {
      inventary = [...data];
    }

  }



</script>

<div class="row mt-4">
  <div class="col-lg-5 col-sm-12">
    <div class="mb-3">
      <div class="input-group">
        <span class="input-group-text"><i class="bi bi-search" /></span>
        <input
          type="text"
          class="form-control"
          placeholder="Buscar Producto..."
          bind:value={search}
          on:input
        />
      </div>
      <div class="form-text text-sm">Ingresa o escanea el código del producto</div>
    </div>
  </div>
  <div class="col-lg-7 col-sm-12">
    <div class="mb-3 d-flex justify-content-end">
      <button
        type="button"
        class="btn btn-primary shadow-sm"
        style="background-color: #1c1f25; border-color:  #1c1f25; color: #FFFFFF"
        data-bs-toggle="offcanvas"
        data-bs-target="#offcanvasInputs"
        ><i class="bi bi-arrow-down-circle-fill" /> Entradas</button
      >
      <button
        type="button"
        class="btn btn-primary mx-2 shadow-sm"
        style="background-color: #1c1f25; border-color:  #1c1f25; color: #FFFFFF"
        data-bs-toggle="offcanvas"
        data-bs-target="#offcanvasOutputs"
        ><i class="bi bi-arrow-up-circle-fill" /> Salidas</button
      >
      <button
        type="button"
        class="btn btn-primary shadow-sm"
        style="background-color: #1c1f25; border-color:  #1c1f25; color: #FFFFFF"
        data-bs-toggle="offcanvas"
        data-bs-target="#offcanvasReport"
        ><i class="bi bi-bar-chart-line-fill"></i> Reporte de Inventario</button
      >
      <button
        type="button"
        class="btn btn-success mx-2 shadow-sm"
        style="background-color: #1c1f25; border-color: #1c1f25; color: #5865f2"
        data-bs-toggle="offcanvas"
        data-bs-target="#offcanvasNewProduct"
        ><i class="bi bi-plus-circle-fill" /> Nuevo Producto</button
      >
    </div>
  </div>
</div>

<InputList {inputs}/>
<OutputList {outputs} />
<ProductReport {inventary} />
