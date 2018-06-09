const SignalingClient = require('../src/signaling-client').SignalingClient;
const SignalingServer = require('../src/signaling-server').SignalingServer;
const assert = require ('assert');

describe('signaling', function() {
    it('should send message to server and disconnect', function(done) {
        const signalingServer = new SignalingServer('127.0.0.1', 1337)
        const signalingClient = new SignalingClient('ws://127.0.0.1:1337/', '<secret token>');

        let clientId = null
        signalingClient.onConnected = (id) => {
            clientId = id
            signalingClient.send(id, 'greeting', 'hello');
        }

        signalingClient.onReceive = (sourceId, objectType, object) => {
            assert.equal(sourceId, clientId)
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

    it('should send message to server and wait for disconnect.', function(done) {
        const signalingServer = new SignalingServer('127.0.0.1', 1337)
        const signalingClient = new SignalingClient('ws://127.0.0.1:1337/', '<secret token>');

        let clientId = null
        signalingClient.onConnected = (id) => {
            clientId = id
            signalingClient.send(id, 'greeting', 'hello');
        }

        signalingClient.onReceive = (sourceId, objectType, object) => {
            assert.equal(sourceId, clientId)
            assert.equal(objectType, 'greeting')
            assert.equal(object, 'hello')
            signalingClient.disconnect()
            signalingServer.close()
        }

        signalingClient.onDisconnect = () => {
            done()
        }
    })

    it ('should connect to https://tlaukkan-webrtc-signaling.herokuapp.com/ message and disconnect.', function(done) {
        this.timeout(5000)
        const signalingClient = new SignalingClient('wss://tlaukkan-webrtc-signaling.herokuapp.com/', '<here would go your secret>');

        let clientId = null
        signalingClient.onConnected = (id) => {
            clientId = id
            signalingClient.send(id, 'greeting', 'hello');
        }

        signalingClient.onReceive = (sourceId, objectType, object) => {
            assert.equal(sourceId, clientId)
            assert.equal(objectType, 'greeting')
            assert.equal(object, 'hello')
            signalingClient.disconnect()
        }

        signalingClient.onDisconnect = () => {
            done()
        }
    })

    it ('should fail to connect to https://non-existent-webrtc-signaling.herokuapp.com/ message and disconnect.', function(done) {
        const signalingClient = new SignalingClient('wss://non-existent-webrtc-signaling.herokuapp.com/', '<here would go your secret>');

        signalingClient.onConnectFailed = () => {
            done()
        }
    })

})
