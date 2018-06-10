const SignalingClient = require('../src/signaling-client').SignalingClient;
const SignalingServer = require('../src/signaling-server').SignalingServer;
const assert = require ('assert');

describe('signaling', function() {
    it('should send message to server and disconnect', function(done) {
        const signalingServer = new SignalingServer('127.0.0.1', 1337)
        const signalingClient = new SignalingClient('ws://127.0.0.1:1337/', '<email>', '<secret token>');
        assert.equal(signalingClient.State.CONNECTING, signalingClient.state)

        let clientId = null
        signalingClient.onConnected = (id) => {
            assert.equal(signalingClient.State.CONNECTED, signalingClient.state)
            clientId = id
            signalingClient.send(id, 'greeting', 'hello');
        }

        signalingClient.onReceive = (sourceId, objectType, object) => {
            assert.equal(sourceId, clientId)
            assert.equal(objectType, 'greeting')
            assert.equal(object, 'hello')
            assert.equal(signalingClient.State.CONNECTED, signalingClient.state)
            signalingClient.disconnect()
        }

        signalingClient.onDisconnect = () => {
            assert.equal(signalingClient.State.DISCONNECTED, signalingClient.state)
            signalingServer.close()
        }

        signalingServer.onClosed = () => {
            done()
        }
    })

    it('should send message to server and wait for disconnect.', function(done) {
        const signalingServer = new SignalingServer('127.0.0.1', 1337)
        const signalingClient = new SignalingClient('ws://127.0.0.1:1337/', '<email>', '<secret token>');
        assert.equal(signalingClient.State.CONNECTING, signalingClient.state)

        let clientId = null
        signalingClient.onConnected = (id) => {
            assert.equal(signalingClient.State.CONNECTED, signalingClient.state)
            clientId = id
            signalingClient.send(id, 'greeting', 'hello');
        }

        signalingClient.onReceive = (sourceId, objectType, object) => {
            assert.equal(signalingClient.State.CONNECTED, signalingClient.state)
            assert.equal(sourceId, clientId)
            assert.equal(objectType, 'greeting')
            assert.equal(object, 'hello')
            signalingClient.disconnect()
            signalingServer.close()
        }

        signalingClient.onDisconnect = () => {
            assert.equal(signalingClient.State.DISCONNECTED, signalingClient.state)
            done()
        }
    })

    it ('should connect to https://tlaukkan-webrtc-signaling.herokuapp.com/ message and disconnect.', function(done) {
        this.timeout(5000)
        const signalingClient = new SignalingClient('wss://tlaukkan-webrtc-signaling.herokuapp.com/', '<email>', '<here would go your secret>');
        assert.equal(signalingClient.State.CONNECTING, signalingClient.state)

        let clientId = null
        signalingClient.onConnected = (id) => {
            assert.equal(signalingClient.State.CONNECTING, signalingClient.state)
            clientId = id
            signalingClient.send(id, 'greeting', 'hello');
        }

        signalingClient.onReceive = (sourceId, objectType, object) => {
            assert.equal(signalingClient.State.CONNECTED, signalingClient.state)
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
        const signalingClient = new SignalingClient('wss://non-existent-webrtc-signaling.herokuapp.com/', '<email>', '<here would go your secret>');
        assert.equal(signalingClient.State.CONNECTING, signalingClient.state)

        signalingClient.onConnectFailed = () => {
            assert.equal(signalingClient.State.CONNECTION_FAILED, signalingClient.state)
            done()
        }
    })

})
