const SignalingServer = require('../src/signaling-server').SignalingServer;
const port = process.env.PORT || 8080;
const signalingServer = new SignalingServer('0.0.0.0', port)

process.on('exit', function() {
    signalingServer.close()
});