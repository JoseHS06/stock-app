

<script>
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
   
</script>
  

<div class="col-lg-4 col-sm-12 mt-4">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div data-bs-toggle="offcanvas" data-bs-target="#offcanvasInventory" on:click={updateInventory}  class="card" style="cursor: pointer; background-color: #13161b">
    <div class="card-body position-relative">
      <h6 class="card-title text-white">{name}</h6>
      <p class="card-text text-muted text-white"><span class="{badgeText}">{badgeContent}</span></p>
    </div>
    <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill {badge}">
      {stock}
    </span>
  </div>
</div>

