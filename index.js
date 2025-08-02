const { app } = require('@azure/functions');

// Import all function definitions
require('./src/functions/devicecode');
require('./src/functions/oauth');
require('./src/functions/callback');
require('./src/functions/proxy');

// Simple test function
app.http('test', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'test',
    handler: async (request, context) => {
        return { body: { message: 'Test function working!' } };
    }
});