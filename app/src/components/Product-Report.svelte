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
        [6, 10 , 25, 50, "Todo"],
        [6, 10 , 25, 50, -1],
      ],
      buttons: [
        {
          extend: "excel",
          className: "btn btn-lg btn-success",
          text: '<i class="bi bi-file-earmark-excel-fill"></i> Descargar Reporte',
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

<div
  class="offcanvas offcanvas-bottom"
  tabindex="-1"
  id="offcanvasReport"
  style="height: 100vh;"
>
  <div class="offcanvas-header">
    <h5 class="offcanvas-title text-white text-center">
      Reporte de inventario
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
      <div class="col-12">
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
    </div>
  </div>
</div>
