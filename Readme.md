# WebRTC Signaling with Node.js WebSocket

This library projects easy signaling for WebRTC utilising Node.js WebSocket server.

## Usage

---
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
---