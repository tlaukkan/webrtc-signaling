require('console-stamp')(console, {
    metadata: function () {
        return ('[' + process.memoryUsage().rss + ']');
    },
    colors: {
        stamp: 'yellow',
        label: 'white',
        metadata: 'green'
    }
});

const SignalingServer = require('../src/signaling-server').SignalingServer;
const port = process.env.PORT || 8080;
const signalingServer = new SignalingServer('0.0.0.0', port)

process.on('exit', function() {
    signalingServer.close()
});