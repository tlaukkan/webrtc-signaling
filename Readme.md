# WebRTC Signaling with Node.js WebSocket

This library projects easy signaling for WebRTC utilising Node.js WebSocket server.

## Usage

Your ID in the signaling server is created by taking SHA256 hash from the secret token you pass in the client
constructor.

### Local test
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

### Using deployed server

---
        const signalingClient = new SignalingClient('wss://tlaukkan-webrtc-signaling.herokuapp.com/', '<here would go your secret>');

        signalingClient.onConnected = (id) => {
            signalingClient.send(id, 'greeting', 'hello');
        }

        signalingClient.onReceive = (objectType, object) => {
            assert.equal(objectType, 'greeting')
            assert.equal(object, 'hello')
            signalingClient.disconnect()
        }

        signalingClient.onDisconnect = () => {
            done()
        }
---

# Publish package

## First publish

---
    npm publish --access public
---

## Update

---
    npm version patch
    npm publish
---

## Deploying signaling server to heroku

### Preparation 

* Checkout this project from github.
* Install heroku cli.

### Commands

---
    heroku create <your-heroku-account>-webrtc-signaling
    git push heroku master
---

### Example logs from HEROKU

---
    2018-06-09T05:57:41.988484+00:00 app[web.1]: signaling server connection request from 10.43.181.164:22969
    2018-06-09T05:57:42.124399+00:00 app[web.1]: signaling server handshake success: 2482c8cb6cb565a2518f7228f65f9954d44f00d20e60df3a7b3954e533578560 10.43.181.164:22969
    2018-06-09T05:57:42.250803+00:00 app[web.1]: signaling server relayed message greeting : "hello" from 2482c8cb6cb565a2518f7228f65f9954d44f00d20e60df3a7b3954e533578560 10.43.181.164:22969 to 2482c8cb6cb565a2518f7228f65f9954d44f00d20e60df3a7b3954e533578560 10.43.181.164:22969
    2018-06-09T05:57:42.375682+00:00 app[web.1]: signaling server disconnected: 2482c8cb6cb565a2518f7228f65f9954d44f00d20e60df3a7b3954e533578560 10.43.181.164:22969
---
