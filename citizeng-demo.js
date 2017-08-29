// Requirements.
var citizengserver = require('./citizeng');

// Initialize the server.
citizengserver.init(3030, "root", "root");

// Declare main page route.
citizengserver.get("/", function (req, res) {
  // Super user's page.
  if (req.user.super) {
    res.sendFile((__dirname + "/indexsuper.html"));
  }
  // Default user's page.
  else {
    res.sendFile((__dirname + "/index.html"));
  }
});

// Declare a reserved page.
citizengserver.get("/admin", function(req, res) {
  res.send("This may have not effect!");
});

// Simple message using socket.io method.
citizengserver.ioset("consolemessage", function(data, ackfunc) {
  // Log.
  console.log(data);
});

// Declare a reserved Socket.io method.
citizengserver.ioset("useradd", function(data, ackfunc) {
  // Log.
  console.log("This may have not effect!");
});

// Start the server.
citizengserver.run();
