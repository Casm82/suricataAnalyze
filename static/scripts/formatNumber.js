// Форматирует числа (class=numField) пробелами
//window.addEventListener("load", formatNumOnLoad, false);

function formatNumOnLoad() {
  var numArrays = document.getElementsByClassName("numField");
  for(var i=0; i < numArrays.length; i++) {
    var elmt = numArrays[i];
    elmt.innerHTML=formatNumber(elmt.textContent);
  }
}

function formatNumber(n){
  var s=n.toString();
  var a=[]; var b=[];
  for(var i=s.length-1; i >= 0; i--) {
    a.push( s.charAt(i) );
  }
  for(var j=1; j <= a.length; j++) {
    b.push( a[j-1] );
    if (!Boolean(j%3)) { b.push(" ") };
  }
  b.reverse();
  return b.join("").trim();
}
