const { app } = require("@azure/functions");

app.http("test", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    return { body: "Test function is working!" };
  },
});