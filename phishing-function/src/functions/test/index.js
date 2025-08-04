module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    
    return {
        status: 200,
        body: "Test function is working!"
    };
};