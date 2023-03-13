<script>
  import { onMount, tick } from "svelte";
  let el;
  onMount(async () => {
    await tick();
    new DataTable(el, {
      dom: 'B<"clear">lfrtip',
      language: {
        url: "./translate.json",
      },
      lengthMenu: [
        [5, 10, 25, 50, -1],
        [5, 10, 25, 50, "Todo"],
      ],
      buttons: [
        {
          extend: "excel",
          className: "btn btn-success",
          text: '<i class="bi bi-file-earmark-excel-fill"></i> Descargar documento',
          titleArttr: "Exportar a Excel",
          exportOptions: {
            modifier: {
              page: "all",
            },
          },
        },
      ],
    });
  });
</script>

<div>
  <table class="table table-dark" bind:this={el}>
    <thead>
      <tr>
        <th>#</th>
        <th>First</th>
        <th>Last</th>
        <th>Handle</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>Mark</td>
        <td>Otto</td>
        <td>@mdo</td>
      </tr>
      <tr>
        <td>1</td>
        <td>Mark</td>
        <td>Otto</td>
        <td>@mdo</td>
      </tr>
      <tr>
        <td>1</td>
        <td>Mark</td>
        <td>Otto</td>
        <td>@mdo</td>
      </tr>
      <tr>
        <td>1</td>
        <td>Mark</td>
        <td>Otto</td>
        <td>@mdo</td>
      </tr>
      <tr>
        <td>1</td>
        <td>Mark</td>
        <td>Otto</td>
        <td>@mdo</td>
      </tr>
      <tr>
        <td>1</td>
        <td>Mark</td>
        <td>Otto</td>
        <td>@mdo</td>
      </tr>
      <tr>
        <td>1</td>
        <td>Mark</td>
        <td>Otto</td>
        <td>@mdo</td>
      </tr>
      <tr>
        <td>1</td>
        <td>Mark</td>
        <td>Otto</td>
        <td>@mdo</td>
      </tr><tr>
        <td>1</td>
        <td>Mark</td>
        <td>Otto</td>
        <td>@mdo</td>
      </tr>
    </tbody>
  </table>
</div>
