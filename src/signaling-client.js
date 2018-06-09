const signaling = require('./signaling-common');

const HandshakeRequest = signaling.HandshakeRequest
const HandshakeResponse = signaling.HandshakeResponse
const Message = signaling.Message

var W3CWebSocket = require('websocket').w3cwebsocket;

exports.SignalingClient = class {
    constructor(url, secret) {
        const self = this
        this.id = null

        this.webSocket = new W3CWebSocket(url, 'webrtc-signaling');
        console.log('signaling browser client connecting ' + url)

        this.send = (targetId, objectType, object) => {
            if (this.id) {
                const objectJson = JSON.stringify(object)
                console.log('signaling client sent message ' + objectType + ' : ' + objectJson)
                self.webSocket.send(JSON.stringify(new Message(this.id, targetId, objectType, objectJson)))
            }
        }

        this.disconnect = () => {
            self.webSocket.close()
        }

        this.onConnected = (id) => {

        }

        this.onConnectFailed = (error) => {

        }

        this.onConnectionError = () => {

        }

        this.onDisconnect = () => {

        }

        this.onReceive = (sourceId, objectType, object) => {

        }

        this.webSocket.onerror = (error) => {
            if (this.id) {
                console.log('signaling client connection error');
                self.onConnectionError(error)
                self.disconnect()
            } else {
                console.log('signaling client connect failed');
                self.onConnectFailed(error);
            }
        };

        this.webSocket.onclose = () => {
            console.log('signaling client disconnected');
            self.onDisconnect();
        };

        this.webSocket.onopen = () => {
            console.log('signaling client connected');
            console.log('signaling client handshake started')
            self.webSocket.send(JSON.stringify(new HandshakeRequest(secret)))
        };

        this.webSocket.onmessage = (message) => {
            if (typeof message.data === 'string') {
                const messageObject = JSON.parse(message.data)
                if (messageObject.typeName === 'HandshakeResponse') {
                    console.log('signaling client handshake complete: ' + messageObject.id);
                    self.id = messageObject.id
                    self.onConnected(messageObject.id);
                }
                if (messageObject.typeName === 'Message') {
                    console.log('signaling client received message ' + messageObject.contentType + ' : ' + messageObject.contentJson)
                    self.onReceive(messageObject.sourceId, messageObject.contentType, JSON.parse(messageObject.contentJson));
                }
            }
        }

    }
}

