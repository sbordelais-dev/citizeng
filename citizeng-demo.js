// Requirements.
var citizeng = require("./citizeng");

// Initialize the server.
citizeng.init(3030, "root", "root", __dirname);

// Declare main page route.
citizeng.get("/", function (req, res) {
  // Super user's page.
  if (req.user.super) {
    res.sendFile((__dirname + "/indexsuper-demo.html"));
  }
  // Default user's page.
  else {
    res.sendFile((__dirname + "/index-demo.html"));
  }
});

// Declare a reserved page route.
citizeng.get("/admin", function(req, res) {
  res.send("This may have not effect!");
});

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
