const SignalingClient = require('../src/signaling-client').SignalingClient;
const SignalingServer = require('../src/signaling-server').SignalingServer;
const assert = require ('assert');

describe('signaling', function() {
    it('should send message to server and disconnect', function(done) {
        const signalingServer = new SignalingServer('127.0.0.1', 1337)
        const signalingClient = new SignalingClient('ws://127.0.0.1:1337/', '<secret token>');

        signalingClient.onConnected = (id) => {
            signalingClient.send(id, 'greeting', 'hello');
        }

        signalingClient.onReceive = (objectType, object) => {
            assert.equal(objectType, 'greeting')
            assert.equal(object, 'hello')
            signalingClient.disconnect()
        }

        signalingClient.onDisconnect = () => {
            signalingServer.close()
        }

        signalingServer.onClosed = () => {
            done()
        }
    })

    it('should send message to server and wait for disconnect', function(done) {
        const signalingServer = new SignalingServer('127.0.0.1', 1337)
        const signalingClient = new SignalingClient('ws://127.0.0.1:1337/', '<secret token>');

        signalingClient.onConnected = (id) => {
            signalingClient.send(id, 'greeting', 'hello');
        }

        signalingClient.onReceive = (objectType, object) => {
            assert.equal(objectType, 'greeting')
            assert.equal(object, 'hello')
            signalingClient.disconnect()
            signalingServer.close()
        }

        signalingClient.onDisconnect = () => {
            done()
        }
    })
})
