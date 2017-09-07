// Requirements.
var citizeng  = require('./citizeng');
var path      = require('path');

// Initialize the server.
citizeng.init(3030, "root", "root", __dirname);

// Declare main page route.
citizeng.get  ( "/"
              , path.join(__dirname, "index-demo.html")
              , path.join(__dirname, "indexsuper-demo.html"));

// Declare other page route.
citizeng.get  ( "/other"
              , path.join(__dirname, "other-demo.html"));

// Declare other page route.
citizeng.get  ( "/othersuper"
              , null
              , path.join(__dirname, "othersuper-demo.html"));

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
citizeng.run  ( function() {
                  // Log.
                  console.log("Call at start-up");
                }
              , function() {
                  // Log.
                  console.log("Call at exit");
                });
