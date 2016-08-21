window.addEventListener("load", function () {
  var consoleLog = document.getElementById("consoleLog");
  var consoleErr = document.getElementById("consoleErr");
  var upload = document.getElementById("upload");
  var socket = io.connect(window.location.origin);

  socket.on('consoleLog', function (data) {
    console.log(data);
    var child = document.createElement("div");
    child.innerHTML = data;
    consoleLog.insertBefore(child, consoleLog.childNodes[0]);
  });

  socket.on('consoleErr', function (data) {
    console.log(data);
    consoleErr.innerHTML = "<div>" + data +"</div>"  ;
  });

  socket.on('consoleClear', function () {
    consoleLog.innerHTML = "";
    consoleErr.innerHTML = "";
    upload.innerHTML = "";
  });

  upload.addEventListener("click", uploadIO, false);
  function uploadIO(clickEvent){
    var inputElms = document.getElementsByTagName("input");
    var selectedFiles = [];
    for (var i=0; i < inputElms.length; i++) {
      if ((inputElms[i].type == "checkbox")&&
        (inputElms[i].checked == true)) { selectedFiles.push(inputElms[i].name)}
    }
    // XHR POST
    var req = new XMLHttpRequest();
    req.open("POST", "/loadLogs");
    req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    req.send(JSON.stringify(selectedFiles));

    req.onreadystatechange = function() {
      if (req.readyState === 4 && req.status === 200) {
        console.log(req.responseText);
      };
    };
  }

}, false);
