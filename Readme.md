# WebRTC Signaling with Node.js WebSocket

This library implements signaling client and server for WebRTC utilising Node.js WebSocket server.

## Usage

Your ID in the signaling server is created by taking SHA256 hash from email + secret token you pass in the client
constructor.

### Example
---
    const SignalingChannel = require('../../src/signaling-channel').SignalingChannel;

    const configuration = { iceServers: [{urls: 'stun:stun1.l.google.com:19302'}] };
    const signalingServerUrl = 'wss://tlaukkan-webrtc-signaling.herokuapp.com/'

    const signalingChannelOne = new SignalingChannel(WebSocket)
    signalingChannelOne.autoReconnect = false
    signalingChannelOne.addServer(signalingServerUrl, 'test1@x.x', uuidv4())

    const signalingChannelTwo = new SignalingChannel(WebSocket)
    signalingChannelTwo.autoReconnect = false
    signalingChannelTwo.addServer(signalingServerUrl, 'test2@x.x', uuidv4(), async (receivedSignalingServerUrl, selfPeerId) => {
        // Offer data channel with signaling channel one.
        const connection = new RTCPeerConnection(configuration)
        const channel = connection.createDataChannel('chat');
        channel.onopen = () => {
            console.log("channel one opened")
            channel.send("test");
        };
        await signalingChannelOne.offer(receivedSignalingServerUrl, selfPeerId, connection)
    })

    signalingChannelTwo.onOffer = (url, peerId, offer) => {
        // Accept data channel with signaling channel two.
        const connection = new RTCPeerConnection(configuration)
        connection.ondatachannel = (event) => {
            const channel = event.channel;
            channel.onopen = () => {
                console.log("channel two opened")
            };
            channel.onmessage = (event) => {
                console.log("channel two received message " + event.data)
            };
        };
        return connection
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
    heroku logs -t
---

### Example logs from HEROKU

---
    2018-06-09T05:57:41.988484+00:00 app[web.1]: signaling server connection request from 10.43.181.164:22969
    2018-06-09T05:57:42.124399+00:00 app[web.1]: signaling server handshake success: 2482c8cb6cb565a2518f7228f65f9954d44f00d20e60df3a7b3954e533578560 10.43.181.164:22969
    2018-06-09T05:57:42.250803+00:00 app[web.1]: signaling server relayed message greeting : "hello" from 2482c8cb6cb565a2518f7228f65f9954d44f00d20e60df3a7b3954e533578560 10.43.181.164:22969 to 2482c8cb6cb565a2518f7228f65f9954d44f00d20e60df3a7b3954e533578560 10.43.181.164:22969
    2018-06-09T05:57:42.375682+00:00 app[web.1]: signaling server disconnected: 2482c8cb6cb565a2518f7228f65f9954d44f00d20e60df3a7b3954e533578560 10.43.181.164:22969
---

### Healt check
Signaling server provides 200 OK healthcheck_ /signaling-health-check.

Example: http://127.0.0.1:8080/signaling-health-check