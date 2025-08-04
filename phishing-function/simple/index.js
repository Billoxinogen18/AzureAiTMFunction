module.exports = async function (context, req) {
    context.log('Simple function processed a request.');
    
    return {
        status: 200,
        body: "Simple function is working!"
    };
};