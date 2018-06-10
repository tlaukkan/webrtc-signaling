const WebSocketServer = require('websocket').server;
const http  = require( 'http');
const signaling = require('./signaling-common');

const HandshakeRequest = signaling.HandshakeRequest
const HandshakeResponse = signaling.HandshakeResponse
const Message = signaling.Message
const sha256 = signaling.sha256

exports.SignalingServer = class {
    constructor(host, port) {
        const self = this;

        this.httpServer = http.createServer(function (request, response) {
            response.writeHead(200, {'Content-Type': 'text/plain'});
            response.end();
        });

        this.httpServer.listen(port, host, function () {
        });

        const webSocketServer = new WebSocketServer({
            httpServer: this.httpServer
        });

        webSocketServer.idConnectionMap = new Map();
        webSocketServer.connectionIdMap = new Map();

        this.close = () => {
            console.log('signaling server closing ...')
            webSocketServer.idConnectionMap.forEach((connection, id) => {
                console.log('signaling server disconnecting: ' + id + ' ' + connection.socket.remoteAddress + ':' + connection.socket.remotePort)
                connection.close()
            })
            self.httpServer.close()
            console.log('signaling server closed.')
            this.onClosed()
        }

        this.onClosed = () => {

        }

        // WebSocket server
        webSocketServer.on('request', function (request) {
            console.log('signaling server connection request from ' + request.socket.remoteAddress + ':' + request.socket.remotePort)

            const connection = request.accept('webrtc-signaling', request.origin);


            connection.on('message', function (message) {
                if (message.type === 'utf8') {
                    const messageObject = JSON.parse(message.utf8Data)
                    if (messageObject.typeName === 'HandshakeRequest') {
                        if (messageObject.email && messageObject.secret) {
                            const id = sha256(messageObject.email.toString() + messageObject.secret.toString());
                            webSocketServer.idConnectionMap.set(id, connection);
                            webSocketServer.connectionIdMap.set(connection, id);
                            console.log('signaling server handshake success: ' + id + ' ' + messageObject.email + ' ' + connection.socket.remoteAddress + ':' + connection.socket.remotePort)
                            connection.sendUTF(JSON.stringify(new HandshakeResponse(id)));
                        } else {
                            console.log('signaling server handshake failed: ' + connection.socket.remoteAddress + ':' + connection.socket.remotePort)
                            connection.sendUTF(JSON.stringify(new HandshakeResponse(null, 'email and or secret is not defined in HandshakeRequest')));
                        }
                    }

                    if (webSocketServer.connectionIdMap.has(connection) && messageObject.typeName === 'Message') {
                        const sourceId = webSocketServer.connectionIdMap.get(connection)
                        if (messageObject.sourceId && messageObject.sourceId === sourceId &&
                            messageObject.targetId && webSocketServer.idConnectionMap.has(messageObject.targetId) &&
                            messageObject.contentType &&
                            messageObject.contentJson) {
                            const targetConnection = webSocketServer.idConnectionMap.get(messageObject.targetId)
                            const messageJson = JSON.stringify(messageObject)
                            console.log('signaling server relayed message ' + messageObject.contentType + ' : ' + messageObject.contentJson + ' from ' + messageObject.sourceId + ' ' + connection.socket.remoteAddress + ':' + connection.socket.remotePort + ' to ' + messageObject.targetId + ' ' + targetConnection.socket.remoteAddress + ':' + targetConnection.socket.remotePort)
                            targetConnection.sendUTF(messageJson)
                        }
                    }
                    // process WebSocket message
                }
            });

            connection.on('close', function () {
                if (webSocketServer.connectionIdMap.has(connection)) {
                    const id = webSocketServer.connectionIdMap.get(connection)
                    console.log('signaling server disconnected: ' + id + ' ' + connection.socket.remoteAddress + ':' + connection.socket.remotePort)
                    webSocketServer.connectionIdMap.delete(connection);
                    webSocketServer.idConnectionMap.delete(id)
                } else {
                    console.log('signaling server disconnection.' + connection.socket.remoteAddress + ':' + connection.socket.remotePort)
                }
            });
        });

        console.log('signaling server listening ws://' + host + ':' + port + '/')
    }
}
