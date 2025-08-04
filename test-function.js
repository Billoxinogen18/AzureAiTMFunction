const { app } = require('@azure/functions');

app.http('test', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'test',
    handler: async (request, context) => {
        return { 
            status: 200,
            headers: { 'Content-Type': 'text/html' },
            body: '<h1>TEST FUNCTION WORKS!</h1><p>This proves Azure Functions v4 is working</p>'
        };
    }
});

app.http('proxy', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: '{*path}',
    handler: async (request, context) => {
        return { 
            status: 200,
            headers: { 'Content-Type': 'text/html' },
            body: '<h1>PROXY FUNCTION TRIGGERED!</h1><p>Path: ' + (request.params.path || 'root') + '</p>'
        };
    }
});