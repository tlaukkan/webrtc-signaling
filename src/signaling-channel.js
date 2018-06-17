const SignalingClient = require('./signaling-client').SignalingClient;

exports.SignalingChannel = class {

    constructor(WebSocket) {
        const self = this

        this.WebSocket = WebSocket

        this.ObjectType = {
            OFFER: 'OFFER',
            ANSWER: 'ANSWER',
            ICE_CANDIDATE: 'ICE_CANDIDATE'
        };

        this.autoReconnect = true
        // Map of server URLs and SignalingClients
        this.clients = new Map()
        // Map of server URLs and onServerConnectedCallbacks
        this.onServerConnectedCallbacks = new Map()
        // RTC peer connections
        this.connections = new Map()

        this.onOffer = (signalingServeUrl, peerId, offer) => {
            throw new Error('signaling channel (' + signalingServeUrl + ') - on offer: onOffer has to be overridden with implementation of returning new RTCPeeringConnection(configuration)');
        }

        // On listen for RTC peer connections.
        this.onServerConnected = (signalingServeUrl, selfPeerId) => {
        }

        this.onServerConnectFailed = (error, signalingServeUrl) => {
        }

        this.onTargetNotFound = (url, targetId, objectType, object) => {

        }

        this.onServerDisconnect = (signalingServeUrl) => {
        }

        this.onServerConnectionError = (signalingServeUrl) => {
        }

        // Closes the signaling channel.
        this.close = () => {
            self.autoReconnect = false
            self.clients.forEach(value => {
                value.disconnect()
            })
        }

        this.removeConnection = (connection) => {
            this.connections.forEach((value, key) => {
                if (value === connection) {
                    self.connections.delete(key)
                }
            })
        }

        this.removeServer = (url) => {
            if (self.clients.has(url)) {
                if (self.clients.get(url).state == self.clients.get(url).State.CONNECTED) {
                    self.clients.get(url).disconnect()
                }
                self.clients.delete(url)
            }
            if (self.onServerConnectedCallbacks.has(url)) {
                self.onServerConnectedCallbacks.delete(url)
            }
            self.connections.forEach((value, key) => {
                if (key.startsWith(url)) {
                    self.connections.delete(key)
                }
            })
        }

        // Start listening for RTC peer connections.
        this.addServer = (url, email, secret, connectedCallback, connectFailedCallback) => {

            if (connectedCallback) {
                self.onServerConnectedCallbacks.set(url, connectedCallback)
            }

            const client = new SignalingClient(WebSocket, url, email, secret);
            self.clients.set(url, client)

            client.onConnected = (id) => {
                self.onServerConnected(url, id)
                if (self.onServerConnectedCallbacks.has(url)) {
                    const onServerConnectedCallback  = self.onServerConnectedCallbacks.get(url)
                    if (onServerConnectedCallback) {
                        onServerConnectedCallback(url, id)
                    }
                    self.onServerConnectedCallbacks.delete(url)
                }
            }

            client.onConnectFailed = (error) => {
                console.log('Connect failed.')
                if (connectFailedCallback) {
                    connectFailedCallback(error)
                }
                self.onServerConnectFailed(error, url)
            }

            client.onTargetNotFound = (targetId, objectType, object) => {
                console.log('signaling channel (' + url + ') - target not found: ' + targetId + ' ' + objectType + ' ' + JSON.stringify(object))
                self.onTargetNotFound(url, targetId, objectType, object)
            }

            client.onInvalidMessage = (targetId, objectType, object) => {
                console.log('signaling channel (' + url + ') - on invalid message: ' + targetId + ' ' + objectType + ' ' + JSON.stringify(object))
            }


            client.onReceive = async (sourceId, objectType, object) => {

                try {
                    if (objectType === self.ObjectType.OFFER) {
                        const connection = self.onOffer(url, sourceId, object)

                        if (connection) {
                            self.connections.set(url + '/' + client.id + "-" + sourceId, connection)

                            connection.onicecandidate = async (candidate) => {
                                try {
                                    client.send(sourceId, self.ObjectType.ICE_CANDIDATE, candidate.candidate)
                                } catch (error) {
                                    console.warn('signaling channel (' + url + ') - on ice candidate: ' + error.message)
                                }
                            };

                            await connection.setRemoteDescription(object)
                            await connection.setLocalDescription(await connection.createAnswer())
                            client.send(sourceId, self.ObjectType.ANSWER, connection.localDescription)
                        }
                    }

                    if (objectType === self.ObjectType.ANSWER) {
                        const connection = self.connections.get(url + '/' + client.id + "-" + sourceId)
                        await connection.setRemoteDescription(object)
                    }

                    if (objectType === self.ObjectType.ICE_CANDIDATE) {
                        if (object) {
                            if (self.connections.has(url + '/' + client.id + "-" + sourceId)) {
                                const connection = self.connections.get(url + '/' + client.id + "-" + sourceId)
                                connection.addIceCandidate(object)
                            }
                        }
                    }
                } catch(e) {
                    error('signaling channel (' + url + ') - on receive: error processing received object ' + objectType + ' ' + JSON.stringify(object) + ':' + e.message)
                }

            }

            client.onDisconnect = () => {
                self.onServerDisconnect(url)
                // Reconnect after 10 seconds.
                //console.log('signaling channel (' + url + ') - on disconnect: disconnected')
                if (self.autoReconnect) {
                    setTimeout(() => {
                        console.log('signaling channel (' + url + ') - on disconnect: auto reconnect enabled, attempting to reconnect')
                        client.connect()
                    }, 3000)
                }
            }

            client.onConnectionError = () => {
                self.onServerConnectionError(url)
            }

        }

        // Send offer to RTC peer
        this.offer = async (signalingServerUrl, peerId, connection) => {
            try {
                let client = self.clients.get(signalingServerUrl)
                await self.waitForClientToConnect(signalingServerUrl, client)

                self.connections.set(signalingServerUrl + '/' + client.id + "-" + peerId, connection)

                connection.onicecandidate = async (candidate) => {
                    try {
                        client.send(peerId, self.ObjectType.ICE_CANDIDATE, candidate.candidate)
                    } catch(error) {
                        console.warn('signaling channel (' + signalingServerUrl + ') - on ice candidate: ' + error.message)
                    }
                };

                connection.createOffer().then(async (offer) => {
                    try {
                        await connection.setLocalDescription(offer);
                        client.send(peerId, self.ObjectType.OFFER, connection.localDescription)
                    } catch(error) {
                        console.error('signaling channel (' + signalingServerUrl + ') - create offer: ' + error.message)
                    }
                })
            } catch(e) {
                error('signaling channel (' + signalingServerUrl + ') - offer : error sending offer to rtc peer: ' + e.message)
            }
        }

        this.waitForClientToConnect = async (signalingServerUrl, client) => {
            if (!client) {
                error('signaling channel (' + signalingServerUrl + ') - waiting for client to connect : not connected to signaling server')
            }

            let i = 0;
            while (client.state !== client.State.CONNECTED) {
                //console.log("offer waiting for client to connect: " + signalingServerUrl)
                await timeout(100)
                i++
                if (i>50) {
                    error('signaling channel (' + signalingServerUrl + ') - waiting for client to connect : timed out');
                }
            }
        }

    }

}

function error(errorMessage) {
    console.error(errorMessage)
    throw new Error(errorMessage)
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
