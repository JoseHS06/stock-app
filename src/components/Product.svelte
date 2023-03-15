<script>
    import Swal from "sweetalert2";
    import { createEventDispatcher } from 'svelte';

    export let id;
    export let name;
    export let stock;
    export let minimum;
    const dispatch = createEventDispatcher();

    const updateInventory = () => {
      dispatch('updateInventory', {
         id: id,
      });
    }
    $: badgeText = stock <= minimum ? (stock == 0 ? 'text-danger' : 'text-warning') : 'text-success';
    $: badge = stock <= minimum ? (stock == 0 ? 'bg-danger' : 'bg-warning') : 'bg-success';
    $: badgeContent = stock <= minimum ? (stock == 0 ? 'Sin stock' : 'Stock mínimo') : 'Con stock' 
   

    const showAlert = () => {

      Swal.fire({
        imageUrl: 'https://img.icons8.com/fluency/256/delete-forever.png',
        imageWidth: 96,
        imageHeight: 96,
        html: `<p><small>¿Esta seguro de <strong>eliminar</strong> el producto seleccionado?</small></p>
                       <p><small style="font-size: 12px">*Esta acción es irreversible.</small></p>`,
        allowOutsideClick: false,
        showDenyButton: true,
        confirmButtonText: 'Si, eliminar',
        denyButtonText: 'Cancelar',
        }).then((result) => {
          if (result.isConfirmed) {

            


          }
      });
          
    }
</script>
  

<div class="col-lg-4 col-sm-12 mt-4">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div on:click={updateInventory}  class="card" style="cursor: pointer; background-color: #13161b">
    <div data-bs-toggle="offcanvas" data-bs-target="#offcanvasInventory" class="card-body position-relative">
      <h6 class="card-title text-white">{name}</h6>
      <p class="card-text text-muted text-white"><span class="{badgeText}">{badgeContent}</span></p>
      <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill {badge}">
        {stock}
      </span>
    </div>
    <div class="card-footer d-flex justify-content-end">
         <button type="button" on:click={() => showAlert()} class="btn btn-sm btn-primary"  style="background-color: #1c1f25; border-color:  #1c1f25; color: #FFFFFF; font-size: 13px"><i class="bi bi-trash-fill"></i> Eliminar</button>
    </div>
  </div>
</div>

