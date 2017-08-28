// Requirements.
var citizenserver = require('./citizen-engine');

// Initialize the server.
citizenserver.init(3030, "root", "root");

// Declare main page route.
citizenserver.get("/", function (req, res) {
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
citizenserver.get("/admin", function(req, res) {
  res.send("This may have not effect!");
});

// Simple message using socket.io method.
citizenserver.ioset("consolemessage", function(data, ackfunc) {
  // Log.
  console.log(data);
});

// Declare a reserved Socket.io method.
citizenserver.ioset("useradd", function(data, ackfunc) {
  // Log.
  console.log("This may have not effect!");
});

// Start the server.
citizenserver.run();
