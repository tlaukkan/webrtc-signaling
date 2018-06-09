const http  = require( 'http');
const signaling = require('./signaling-common');

const HandshakeRequest = signaling.HandshakeRequest
const HandshakeResponse = signaling.HandshakeResponse
const Message = signaling.Message
const sha256 = signaling.sha256

const WebSocketClient = require('websocket').client;

exports.SignalingClient = class {
    constructor(url, secret) {
        const self = this
        this.id = null
        this.connection = null
        this.webSocketClient = new WebSocketClient();

        this.send = (targetId, objectType, object) => {
            if (self.connection) {
                const objectJson = JSON.stringify(object)
                console.log('signaling client sent message ' + objectType + ' : ' + objectJson)
                self.connection.sendUTF(JSON.stringify(new Message(this.id, targetId, objectType, objectJson)))
            }
        }

        this.disconnect = () => {
            self.connection.close()
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

        this.webSocketClient.on('connectFailed', function(error) {
            console.log('signaling client connect failed: ' + error.toString());
            self.onConnectFailed(error);
        });

        this.webSocketClient.on('disconnect', function() {
            self.connection.close()
        });

        this.webSocketClient.on('connect', function(connection) {
            self.connection = connection
            console.log('signaling client connected');

            connection.on('error', (error) => {
                console.log('signaling client connection error: ' + error.toString());
                self.onConnectionError(error)
            });

            connection.on('close', () => {
                console.log('signaling client disconnected');
                self.onDisconnect();
            });

            connection.on('message', (message) => {
                if (message.type === 'utf8') {
                    const messageObject = JSON.parse(message.utf8Data)
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
            });

            console.log('signaling client handshake started')
            connection.sendUTF(JSON.stringify(new HandshakeRequest(secret)))
        });

        this.webSocketClient.connect(url, 'webrtc-signaling');

        console.log('signaling client connecting ' + url)


    }
}

