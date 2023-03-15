<script>
  import Swal from "sweetalert2";
  export let inputs;

  const showAlert = () => {
    Swal.fire({
      imageUrl: "https://img.icons8.com/fluency/256/delete-forever.png",
      imageWidth: 96,
      imageHeight: 96,
      html: `<p><small>¿Esta seguro de <strong>eliminar</strong>  el registro seleccionado?</small></p>
                 <p><small style="font-size: 12px">*Esta acción es irreversible.</small></p>`,
      allowOutsideClick: false,
      showDenyButton: true,
      confirmButtonText: "Si, eliminar",
      denyButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
      }
    });
  };
</script>

<div
  class="offcanvas offcanvas-bottom"
  tabindex="-1"
  id="offcanvasInputs"
  style="height: 100vh;"
>
  <div class="offcanvas-header">
    <h5 class="offcanvas-title text-white text-center">
      Entradas de inventario
    </h5>
    <button
      type="button"
      class="btn btn-danger"
      style="color: #ffffff; border-radius: 100%; width: 40px; height: 40px; 
      background: #1c1f25 !important;
      border-color: #1c1f25;"
      data-bs-dismiss="offcanvas"
      aria-label="Close"><i class="bi bi-x-lg" /></button
    >
  </div>
  <div class="offcanvas-body small">
    <div class="container d-flex justify-content-center">
      <div class="col-6">
        <ul class="list-group">
          {#each inputs as { product_name: name, action_date: date, quantity }}
            <li class="list-group-item">
              <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">{name}</h6>
                <small>{date}</small>
              </div>
              <span>Cantidad: {quantity} Producto(s)</span>
              <div class="w-100 d-flex justify-content-end">
                <button
                  type="button"
                  on:click={() => showAlert()}
                  class="btn btn-sm btn-primary"
                  style="background-color: #1c1f25; border-color:  #1c1f25; color: #FFFFFF; font-size: 13px"
                  ><i class="bi bi-trash-fill" /> Eliminar</button
                >
              </div>
            </li>
          {/each}
        </ul>
      </div>
    </div>
  </div>
</div>
