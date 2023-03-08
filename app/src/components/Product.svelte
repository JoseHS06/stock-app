<script>
    import { createEventDispatcher } from 'svelte';

    export let id;
    export let name;
    export let stock;
    const dispatch = createEventDispatcher();

    const updateInventory = () => {
      dispatch('updateInventory', {
         id: id,
      });
    }

</script>


<div class="col-lg-4 col-sm-12 mt-4">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div data-bs-toggle="offcanvas" data-bs-target="#offcanvasInventory" on:click={updateInventory}  class="card" style="cursor: pointer; background-color: #13161b">
    <div class="card-body">
      <h6 class="card-title text-white">{name}</h6>
      <p class="card-text text-muted text-white"><span class="badge text-bg-success" style="background-color: #1c1f25 !important; color: #69c76b !important">Stock: {stock}</span></p>
    </div>
  </div>
</div>

