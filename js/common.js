/* Generate random string */
function ctzGenerateString(len) {
  var string = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
  for (var i = 0; i < len; i++) {
    string += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  // Done.
  return string;
}

/* Show/Hide DIV section. */
function ctzToggleDiv(divelem, blockornone) {
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
function ctzSetCookie(cname, cvalue, exdays) {
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
function ctzGetCookie(cname) {
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

/* HTTP GET function. */
function ctzHttpGet(url, callback)
{
  var xmlHttp = new XMLHttpRequest();
  if (null == xmlHttp ) return ;
  xmlHttp.onreadystatechange = function() {
    if ((4 == xmlHttp.readyState) && (200 == xmlHttp.status))
      callback(xmlHttp.responseText);
  }
  xmlHttp.open("GET", url, true);
  xmlHttp.send(null);
}

/* OS type */
function ctzGetOS() {
  var userAgent = window.navigator.userAgent,
  platform = window.navigator.platform,
  macosPlatforms = ["Macintosh", "MacIntel", "MacPPC", "Mac68K"],
  windowsPlatforms = ["Win32", "Win64", "Windows", "WinCE"],
  iosPlatforms = ["iPhone", "iPad", "iPod"],
  os = "unknown";

  if (macosPlatforms.indexOf(platform) !== -1) {
    os = "Mac OS";
  } else if (iosPlatforms.indexOf(platform) !== -1) {
    os = "iOS";
  } else if (windowsPlatforms.indexOf(platform) !== -1) {
    os = "Windows";
  } else if (/Android/.test(userAgent)) {
    os = "Android";
  } else if (!os && /Linux/.test(platform)) {
    os = "Linux";
  }

  // Done.
  return os;
}

/* Brower version */
function ctzGetBrowser() {
  var isIE = false;
  var isChrome = false;
  var isOpera = false;

  // Opera 8.0+.
  if ((isOpera = ((!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0))) {
    return "opera";
  }
  // Firefox 1.0+.
  else if (typeof InstallTrigger !== 'undefined') {
    return "firefox";
  }
  // Safari 3.0+ "[object HTMLElementConstructor]".
  else if (/constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || safari.pushNotification)) {
    return "safari";
  }
  // Internet Explorer 6-11
  else if (/*@cc_on!@*/false || !!document.documentMode) {
    return "ie";
  }
  // Edge 20+.
  else if ((isIE = (!isIE && !!window.StyleMedia))) {
    return "edge";
  }
  // Chrome 1+.
  else if ((isChrome = (!!window.chrome && !!window.chrome.webstore))) {
    return "chrome";
  }
  // Blink engine detection.
  else if ((isChrome || isOpera) && !!window.CSS) {
    return "blink";
  }
  else {
    return "unknown";
  }
}

/* Complete client information */
function ctzGetClientInfo() {
  // Client information object.
  var clientInfo = {browser:"", device:"", os:""};

  // Set client information.
  var md = null;
  try {
    md = new MobileDetect(window.navigator.userAgent);
  }
  catch(err) {
    // need to include '/citizeng.js/mobile-detect.min.js'.
    return clientInfo;
  }
  if (null == md) return clientInfo;
  var mobile = md.mobile();
  var device = md.phone();

  if (null == mobile) {
    clientInfo.browser = ctzGetBrowser();
    clientInfo.device = "desktop";
    clientInfo.os = ctzGetOS();
  }
  else {
    if (null == (clientInfo.browser = md.userAgent())) clientInfo.browser = "unknown";
    if (null == (clientInfo.device = (null == device)? md.tablet() : device)) clientInfo.device = "unknown";
    if (null == (clientInfo.os = md.os())) clientInfo.os = "unknown";
  }

  // Done;
  return clientInfo;
}
