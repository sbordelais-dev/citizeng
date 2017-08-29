/* Generate random string */
function generateString(len) {
  var string = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
  for (var i = 0; i < len; i++) {
    string += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  // Done.
  return string;
}

/* Show/Hide DIV section. */
function toggleDiv(divelem, blockornone) {
  if (null == divelem) return ;
  if (blockornone) {
    divelem.style.display = blockornone;
  }
  else {
    if (divelem.style.display === "none") {
      divelem.style.display = "block";
    } else {
      divelem.style.display = "none";
    }
  }
}

/* Set cookie function. */
function setCookie(cname, cvalue, exdays) {
  var cookie = cname + "=" + cvalue;
  if (0 < exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    cookie += ";" + expires;
  }
  cookie += ";path=/";
  
  // Set the cookie.
  document.cookie = cookie;
}

/* Get cookie function. */
function getCookie(cname) {
  var name = cname + "=";
  var ca = document.cookie.split(';');
  for(var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}
