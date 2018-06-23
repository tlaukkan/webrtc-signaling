const signaling = require('./signaling-common');

const HandshakeRequest = signaling.HandshakeRequest
const Message = signaling.Message
const RelayErrorReason = signaling.RelayErrorReason

exports.SignalingClient = class {
    constructor(WebSocket, url, email, secret) {
        this.WebSocket = WebSocket
        this.State = {
            CONNECTING: 'CONNECTING',
            CONNECTION_FAILED: 'CONNECTION_FAILED',
            CONNECTED: 'CONNECTED',
            DISCONNECTED: 'DISCONNECTED'
        };


        this.id = null
        this.email = email

        this.state = this.State.DISCONNECTED
        this.webSocket = null;

        this.send = (targetId, objectType, object) => {
            if (this.state != this.State.CONNECTED) {
                throw new Error("signaling client send() called when in state is not connected: " + this.state)
            }
            if (this.id) {
                const objectJson = JSON.stringify(object)
                //console.log('signaling client sent message ' + objectType + ' : ' + objectJson)
                this.webSocket.send(JSON.stringify(new Message(this.id, targetId, objectType, objectJson)))
            }
        }

        this.disconnect = () => {
            this.webSocket.close()
        }

        this.connect = () => {
            if (this.state != this.State.DISCONNECTED && this.state != this.State.CONNECTION_FAILED) {
                console.log.error("signaling client connect() called when in state is not disconnected or connection failed");
                throw new Error("signaling client connect() called when in state is not disconnected or connection failed: " + this.state)
            }
            this.state = this.State.CONNECTING
            if (this.webSocket) {
                this.webSocket.close()
            }
            this.webSocket = new this.WebSocket(url, 'webrtc-signaling');

            this.webSocket.onerror = (error) => {
                if (this.id) {
                    //console.log('signaling client connection error');
                    this.onConnectionError(error)
                    this.disconnect()
                } else {
                    //console.log('signaling client connect failed');
                    this.state = this.State.CONNECTION_FAILED
                    this.onConnectFailed(error);
                }
            };

            this.webSocket.onclose = () => {
                //console.log('signaling client disconnected');
                this.state = this.State.DISCONNECTED
                this.onDisconnect();
                this.webSocket.close()
            };

            this.webSocket.onopen = () => {
                //console.log('signaling client connected');
                //console.log('signaling client handshake started')
                this.webSocket.send(JSON.stringify(new HandshakeRequest(email, secret)))
            };

            this.webSocket.onmessage = (message) => {
                if (typeof message.data === 'string') {
                    const messageObject = JSON.parse(message.data)
                    if (messageObject.typeName === 'HandshakeResponse') {
                        if (messageObject.id) {
                            //console.log('signaling client handshake complete: ' + messageObject.id);
                            this.id = messageObject.id
                            this.state = this.State.CONNECTED
                            this.onConnected(messageObject.id);
                        } else {
                            console.warn('signaling client handshake failed: ' + messageObject.error);
                            this.disconnect()
                            this.state = this.State.CONNECTION_FAILED
                        }
                    }
                    if (messageObject.typeName === 'Message') {
                        //console.log('signaling client received message : ' + messageObject.contentType + ' : ' + messageObject.contentJson + ' from ' + messageObject.sourceId)
                        this.onReceive(messageObject.sourceId, messageObject.contentType, JSON.parse(messageObject.contentJson));
                    }
                    if (messageObject.typeName === 'RelayError') {
                        if (messageObject.reason === RelayErrorReason.MESSAGE_INVALID) {
                            this.onInvalidMessage(messageObject.message.targetId, messageObject.message.contentType, JSON.parse(messageObject.message.contentJson))
                        }
                        if (messageObject.reason === RelayErrorReason.TARGET_NOT_FOUND) {
                            this.onTargetNotFound(messageObject.message.targetId, messageObject.message.contentType, JSON.parse(messageObject.message.contentJson))
                        }
                    }
                }
            }

            //console.log('signaling client connecting ' + url)
        }

        this.onConnected = (id) => {

        }

        this.onConnectFailed = (error) => {

        }

        this.onConnectionError = () => {

        }

        this.onTargetNotFound = (targetId, objectType, object) => {

        }

        this.onInvalidMessage = (targetId, objectType, object) => {

        }

        this.onDisconnect = () => {

        }

        this.onReceive = (sourceId, objectType, object) => {

        }

        this.connect();

    }
}

