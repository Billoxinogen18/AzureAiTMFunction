const { app } = require("@azure/functions");

app.http("simple", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    return { body: "Hello from Azure Functions!" };
  },
});