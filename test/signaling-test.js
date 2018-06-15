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

const SignalingClient = require('../src/signaling-client').SignalingClient;
const SignalingServer = require('../src/signaling-server').SignalingServer;
const W3CWebSocket = require('websocket').w3cwebsocket;

const assert = require ('assert');

describe('signaling', function() {
    it('should send message to server and disconnect', function(done) {
        const signalingServer = new SignalingServer('127.0.0.1', 1337)
        const signalingClient = new SignalingClient(W3CWebSocket, 'ws://127.0.0.1:1337/', '<email>', '<secret token>');
        assert.equal(signalingClient.state, signalingClient.State.CONNECTING)

        let clientId = null
        signalingClient.onConnected = (id) => {
            assert.equal(signalingClient.state, signalingClient.State.CONNECTED)
            clientId = id
            signalingClient.send(id, 'greeting', 'hello');
        }

        signalingClient.onReceive = (sourceId, objectType, object) => {
            assert.equal(sourceId, clientId)
            assert.equal(objectType, 'greeting')
            assert.equal(object, 'hello')
            assert.equal(signalingClient.state, signalingClient.State.CONNECTED)
            signalingClient.disconnect()
        }

        signalingClient.onDisconnect = () => {
            assert.equal(signalingClient.state, signalingClient.State.DISCONNECTED)
            signalingServer.close()
        }

        signalingServer.onClosed = () => {
            done()
        }
    })

    it('should send message to non existent server, receive RelayError and disconnect', function(done) {
        const signalingServer = new SignalingServer('127.0.0.1', 1337)
        const signalingClient = new SignalingClient(W3CWebSocket, 'ws://127.0.0.1:1337/', '<email>', '<secret token>');
        assert.equal(signalingClient.state, signalingClient.State.CONNECTING)

        signalingClient.onConnected = (id) => {
            assert.equal(signalingClient.state, signalingClient.State.CONNECTED)
            signalingClient.send('test-id', 'greeting', 'hello');
        }

        signalingClient.onTargetNotFound = (targetId, objectType, object) => {
            assert.equal(targetId, 'test-id')
            assert.equal(objectType, 'greeting')
            assert.equal(object, 'hello')
            assert.equal(signalingClient.state, signalingClient.State.CONNECTED)
            signalingClient.disconnect()
        }

        signalingClient.onDisconnect = () => {
            assert.equal(signalingClient.state, signalingClient.State.DISCONNECTED)
            signalingServer.close()
        }

        signalingServer.onClosed = () => {
            done()
        }
    })

    it('should send incorect message, receive RelayError and disconnect', function(done) {
        const signalingServer = new SignalingServer('127.0.0.1', 1337)
        const signalingClient = new SignalingClient(W3CWebSocket, 'ws://127.0.0.1:1337/', '<email>', '<secret token>');
        assert.equal(signalingClient.state, signalingClient.State.CONNECTING)

        signalingClient.onConnected = (id) => {
            assert.equal(signalingClient.state, signalingClient.State.CONNECTED)
            signalingClient.send(null, 'greeting', 'hello');
        }

        signalingClient.onInvalidMessage = (targetId, objectType, object) => {
            assert.equal(targetId, null)
            assert.equal(objectType, 'greeting')
            assert.equal(object, 'hello')
            assert.equal(signalingClient.state, signalingClient.State.CONNECTED)
            signalingClient.disconnect()
        }

        signalingClient.onDisconnect = () => {
            assert.equal(signalingClient.state, signalingClient.State.DISCONNECTED)
            signalingServer.close()
        }

        signalingServer.onClosed = () => {
            done()
        }
    })

    it('should send message to server and wait for disconnect.', function(done) {
        const signalingServer = new SignalingServer('127.0.0.1', 1337)
        const signalingClient = new SignalingClient(W3CWebSocket, 'ws://127.0.0.1:1337/', '<email>', '<secret token>');
        assert.equal(signalingClient.state, signalingClient.State.CONNECTING)

        let clientId = null
        signalingClient.onConnected = (id) => {
            assert.equal(signalingClient.state, signalingClient.State.CONNECTED)
            clientId = id
            signalingClient.send(id, 'greeting', 'hello');
        }

        signalingClient.onReceive = (sourceId, objectType, object) => {
            assert.equal(signalingClient.state, signalingClient.State.CONNECTED)
            assert.equal(sourceId, clientId)
            assert.equal(objectType, 'greeting')
            assert.equal(object, 'hello')
            signalingClient.disconnect()
            signalingServer.close()
        }

        signalingClient.onDisconnect = () => {
            assert.equal(signalingClient.state, signalingClient.State.DISCONNECTED)
            done()
        }
    })

    it ('should connect to https://tlaukkan-webrtc-signaling.herokuapp.com/ message and disconnect.', function(done) {
        this.timeout(5000)
        const signalingClient = new SignalingClient(W3CWebSocket, 'wss://tlaukkan-webrtc-signaling.herokuapp.com/', '<email>', '<here would go your secret>');
        assert.equal(signalingClient.state, signalingClient.State.CONNECTING)

        let clientId = null
        signalingClient.onConnected = (id) => {
            assert.equal(signalingClient.state, signalingClient.State.CONNECTED)
            clientId = id
            signalingClient.send(id, 'greeting', 'hello');
        }

        signalingClient.onReceive = (sourceId, objectType, object) => {
            assert.equal(signalingClient.state, signalingClient.State.CONNECTED)
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
        const signalingClient = new SignalingClient(W3CWebSocket, 'wss://non-existent-webrtc-signaling.herokuapp.com/', '<email>', '<here would go your secret>');
        assert.equal(signalingClient.state, signalingClient.State.CONNECTING)

        signalingClient.onConnectFailed = () => {
            assert.equal(signalingClient.state, signalingClient.State.CONNECTION_FAILED)
            done()
        }
    })

})
