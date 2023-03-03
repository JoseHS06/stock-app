<script>
  export let totalPages, page, disabledLast, disabledFirst , setPage;

</script>

<ul class="pagination mt-4">
  <li class="page-item">
    <button
      type="button"
      class="page-link {disabledFirst}"
      on:click={() => setPage(page - 1)}
    >
      Anterior
    </button>
  </li>

  {#each totalPages as pg, i}
    <li class="page-item {page == i ? 'active' : ''}">
      <button type="button" class="page-link" on:click={() => setPage(i)}>
        {i + 1}
      </button>
    </li>
  {/each}

  <li class="page-item">
    <button
      type="button"
      class="page-link {disabledLast}"
      on:click={() => setPage(page + 1)}
    >
      Siguiente
    </button>
  </li>
</ul>
