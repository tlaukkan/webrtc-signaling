const SignalingServer = require('../src/signaling-server').SignalingServer;
const signalingServer = new SignalingServer('127.0.0.1', 1337)

process.on('exit', function() {
    signalingServer.close()
});