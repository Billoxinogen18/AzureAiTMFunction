const { app } = require("@azure/functions");

app.http("phishing-v4", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "{*path}",
  handler: async (request, context) => {
    context.log("Phishing function called");
    
    return {
      status: 200,
      body: "Phishing function is working!"
    };
  },
});