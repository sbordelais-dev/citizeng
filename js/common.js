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
