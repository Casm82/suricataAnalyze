window.addEventListener("load", function () {
  var reportsPerPageElm = document.getElementById("reportsPerPage");

  // Изменение количества отчётов на страницу
  reportsPerPageElm.addEventListener("change", function(){
    createTiles();
    listReports();
  }, false);

  // Создаём плашки перехода на другие страницы
  createTiles();
  // Список отчётов при загрузке страницы
  listReports();
}, false);

function createTiles(){
  // Текущая страница и общее количество страниц
  var currentPageElm = document.getElementById("currentPage");
  currentPageElm.textContent = "1";
  var totalReportsElm = document.getElementById("totalReports");

  var reportsPerPageNum = Number(document.getElementById("reportsPerPage").value);
  if (reportsPerPageNum > 1) {
    var totalPagesNum = Math.ceil(totalReportsElm.dataset.numreports/reportsPerPageNum);
  } else {
    var totalPagesNum = "1";
  }
  var totalPagesElm = document.getElementById("totalPages");
  totalPagesElm.textContent = totalPagesNum;

  // Создаём плашки перехода на другие страницы
  var sliderElm = document.getElementById("slider");
  sliderElm.innerHTML = "";

  if (totalPagesNum > 1 ) {
    for(var i=1; i <= totalPagesNum; i++){
      var tileElm = document.createElement("span");
      tileElm.addEventListener("click", selectTile, false);
      tileElm.textContent = i;
      tileElm.className = "tile";
      slider.appendChild(tileElm);
    }
  }
}

function selectTile(){
  var currentPageElm = document.getElementById("currentPage");
  currentPageElm.textContent = this.textContent;
  var tileElms = document.getElementsByClassName("tile");
  // Подсветка текущей плашки
  for(var j=0; j < tileElms.length; j++) {
    if (tileElms[j] == this) {
      tileElms[j].className = "tile selectedPage";
    } else {
      tileElms[j].className = "tile";
    }
  }
  listReports();
}

function listReports() {
  var crt = document.getElementById("crt");
  var currentPageTxt = document.getElementById("currentPage").textContent;
  var reportsPerPageTxt = document.getElementById("reportsPerPage").value;
  // XHR POST
  var req = new XMLHttpRequest();
  req.open("POST", "/listReports");
  req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
  req.send(JSON.stringify({"pageNum": currentPageTxt, "reportsPerPage": reportsPerPageTxt}));

  req.onreadystatechange = function() {
    if (req.readyState === 4 && req.status === 200) {
      crt.innerHTML = req.responseText;
    };
  };
};
