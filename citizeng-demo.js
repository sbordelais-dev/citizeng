// Requirements.
var citizeng = require("./citizeng");

// Initialize the server.
citizeng.init(3030, "root", "root", __dirname);

// Declare main page route.
citizeng.get  ( "/"
              , (__dirname + "/index-demo.html")
              , (__dirname + "/indexsuper-demo.html"));

// Declare other page route.
citizeng.get  ( "/other"
               , (__dirname + "/other-demo.html"));

// Declare other page route.
citizeng.get  ( "/othersuper"
              , null
              , (__dirname + "/othersuper-demo.html"));

// Declare a reserved page route.
citizeng.get("/admin", null, null);

// Simple message using socket.io method.
citizeng.ioset("consolemessage", function(data, ackfunc) {
  // Log.
  console.log(data);
});

// Declare a reserved Socket.io method.
citizeng.ioset("useradd", function(data, ackfunc) {
  // Log.
  console.log("This may have not effect!");
});

// Start the server.
citizeng.run();
