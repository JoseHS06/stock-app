
  <script>
       import Searchbar from "./Searchbar.svelte";
  </script>
  
  <div
    class="d-flex align-items-center p-3 my-3 text-white rounded shadow"
    style="background-color: #130f40"
  >
    <div style="width: 42px; height: 42px">
      <i class="bi bi-box-fill mr-2" style="font-size: 30px;" />
    </div>
    <div class="lh-1">
      <h1 class="h6 mb-0 text-white lh-1">Sistema de Inventario</h1>
      <small>Entradas y Salidas</small>
    </div>
  </div>

  <Searchbar on:input/>
