<script>
    export let currentPageRows;

    $: isEmptyList = (currentPageRows.length == 0)
</script>

<div class="col-12 {!isEmptyList ? 'd-none' : ''}">
    <div class="d-flex justify-content-center">
       <p class="text-muted">Ooops... No se encontraron productos</p>
    </div>
</div>