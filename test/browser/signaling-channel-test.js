const assert = require('assert');
const SignalingChannel = require('../../src/signaling-channel').SignalingChannel;
const uuidv4 = require('uuid/v4');

describe('webrtc-signaling-channel', function() {
    it('should connect and send message', function(done) {

        this.timeout(10000)

        const configuration = { iceServers: [{urls: 'stun:stun1.l.google.com:19302'}] };
        const signalingServerUrl = 'wss://tlaukkan-webrtc-signaling.herokuapp.com/'

        const signalingChannelOne = new SignalingChannel(WebSocket)
        const connectionOne = new RTCPeerConnection(configuration)

        signalingChannelOne.autoReconnect = false
        signalingChannelOne.onServerConnectFailed = (error, signalingServerUrl) => {
            console.log('signal channel one server connect failed ' + signalingServerUrl + " " + error);
        }
        signalingChannelOne.onServerConnectionError = (signalingServerUrl) => {
            console.log('signal channel one server connection error ' + signalingServerUrl);
        }
        signalingChannelOne.onServerDisconnect = (signalingServerUrl) => {
            console.log('signal channel one server disconnect ' + signalingServerUrl);
            signalingChannelOne.close()
            signalingChannelTwo.close()
            connectionOne.close()
            connectionTwo.close()
            done()
        }
        console.log('signal channel one connecting...')
        signalingChannelOne.addServer(signalingServerUrl, 'test11@x.x', uuidv4())

        const signalingChannelTwo = new SignalingChannel(WebSocket)
        const connectionTwo = new RTCPeerConnection(configuration)

        signalingChannelTwo.autoReconnect = false
        signalingChannelTwo.onServerConnectFailed = (error, signalingServerUrl) => {
            console.log('signal channel two server connect failed ' + signalingServerUrl + " " + error);
        }
        signalingChannelTwo.onServerConnectionError = (signalingServerUrl) => {
            console.log('signal channel two server connection error ' + signalingServerUrl);
        }
        signalingChannelTwo.onServerDisconnect = (signalingServerUrl) => {
            console.log('signal channel two server disconnect ' + signalingServerUrl);
        }
        console.log('signal channel two connecting...')
        signalingChannelTwo.addServer(signalingServerUrl, 'test22@x.x', uuidv4(), async (receivedSignalingServerUrl, selfPeerId) => {
            // Offer data channel with signaling channel one.
            const channel = connectionOne.createDataChannel('chat');
            channel.onopen = () => {
                console.log("channel one opened")
                channel.send("test");
            };
            await signalingChannelOne.offer(receivedSignalingServerUrl, selfPeerId, connectionOne)
            console.log('signaling channel one sent offer')
        })

        signalingChannelTwo.onOffer = (url, peerId, offer) => {

            // Accept data channel with signaling channel two.
            console.log('signaling channel two received offer ')
            connectionTwo.ondatachannel = (event) => {
                const channel = event.channel;
                channel.onopen = () => {
                    console.log("channel two opened")
                };
                channel.onmessage = (event) => {
                    console.log("channel two received message " + event.data)
                    assert(event.data, 'test')
                    signalingChannelOne.removeConnection(connectionTwo)
                    signalingChannelOne.removeServer(signalingServerUrl)
                    signalingChannelTwo.removeServer(signalingServerUrl)
                    signalingChannelTwo.close()
                };
            };
            return connectionTwo

        }

    })

    it('should connect and send message and fail no target not found', function(done) {

        this.timeout(10000)

        const configuration = { iceServers: [{urls: 'stun:stun1.l.google.com:19302'}] };
        const signalingServerUrl = 'wss://tlaukkan-webrtc-signaling.herokuapp.com/'
        const connection = new RTCPeerConnection(configuration)

        const signalingChannelOne = new SignalingChannel(WebSocket)
        signalingChannelOne.autoReconnect = false
        signalingChannelOne.onServerConnectFailed = (error, signalingServerUrl) => {
            console.log('signal channel one server connect failed ' + signalingServerUrl + " " + error);
        }
        signalingChannelOne.onServerConnectionError = (signalingServerUrl) => {
            console.log('signal channel one server connection error ' + signalingServerUrl);
        }
        signalingChannelOne.onServerDisconnect = (signalingServerUrl) => {
            console.log('signal channel one server disconnect ' + signalingServerUrl);
            signalingChannelOne.close()
            connection.close()
            done()
        }

        console.log('signal channel one connecting...')
        signalingChannelOne.addServer(signalingServerUrl, 'test11@x.x', uuidv4())

        signalingChannelOne.onServerConnected = async (signalingServerUrl, selfPeerId) => {
            // Offer data channel with signaling channel one.
            const channel = connection.createDataChannel('chat');
            channel.onopen = () => {
                console.log("channel one opened")
                channel.send("test");
            };
            await signalingChannelOne.offer(signalingServerUrl, 'test-peer-url', connection)
            console.log('signaling channel one sent offer')
        }

        signalingChannelOne.onTargetNotFound = (targetId) => {
            assert.equal(targetId, 'test-peer-url')
            signalingChannelOne.close()
            done()
        }


    })

    it('should fail to connect', function(done) {

        this.timeout(10000)

        const signalingServerUrl = 'wss://tlaukkan-webrtc-signaling-non-existent.herokuapp.com/'

        const signalingChannelOne = new SignalingChannel(WebSocket)
        signalingChannelOne.autoReconnect = false
        signalingChannelOne.onServerConnectFailed = (error, signalingServerUrl) => {
            console.log('signal channel one server connect failed ' + signalingServerUrl + " " + error.message);
            done()
        }
        signalingChannelOne.onServerConnectionError = (signalingServerUrl) => {
            console.log('signal channel one server connection error ' + signalingServerUrl);
        }
        signalingChannelOne.onServerDisconnect = (signalingServerUrl) => {
            console.log('signal channel one server disconnect ' + signalingServerUrl);
        }
        signalingChannelOne.addServer(signalingServerUrl, 'test33@x.x', uuidv4())

    })

})