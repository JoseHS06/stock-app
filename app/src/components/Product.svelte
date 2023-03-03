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


<div class="col-4 mt-4">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div data-bs-toggle="offcanvas" data-bs-target="#offcanvasInventory"  on:click={updateInventory}  class="card" style="cursor: pointer;">
    <div class="card-body">
      <h6 class="card-title">{name}</h6>
      <p class="card-text text-muted">Stock: {stock}</p>
    </div>
  </div>
</div>

