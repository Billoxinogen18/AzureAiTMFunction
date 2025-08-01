const { app } = require('@azure/functions');

// Minimal test function
app.http('test', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'test',
    handler: async (request, context) => {
        return { body: { message: 'Test function working!' } };
    }
});