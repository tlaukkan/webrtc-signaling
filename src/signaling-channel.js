const SignalingClient = require('./signaling-client').SignalingClient;

exports.SignalingChannel = class {

    constructor(WebSocketImplementation) {
        this.WebSocketImplementation = WebSocketImplementation;

        this.ObjectType = {
            OFFER: 'OFFER',
            ANSWER: 'ANSWER',
            ICE_CANDIDATE: 'ICE_CANDIDATE'
        };

        this.autoReconnect = true;
        // Map of server URLs and SignalingClients
        this.clients = new Map();
        // Map of server URLs and onServerConnectedCallbacks
        this.onServerConnectedCallbacks = new Map();
        // RTC peer connections
        this.connections = new Map();

        this.onOffer = (signalingServeUrl, peerId, offer) => {
            throw new Error('signaling channel (' + signalingServeUrl + ', ' + peerId + ',' + offer + ') - on offer: onOffer has to be overridden with implementation of returning new RTCPeeringConnection(configuration)');
        };

        // On listen for RTC peer connections.
        this.onServerConnected = (signalingServeUrl, selfPeerId) => {};

        this.onServerConnectFailed = (error, signalingServeUrl) => {};

        this.onTargetNotFound = (url, targetId, objectType, object) => {};

        this.onServerDisconnect = (signalingServeUrl) => {};

        this.onServerConnectionError = (signalingServeUrl) => {};

        // Closes the signaling channel.
        this.close = () => {
            this.autoReconnect = false;
            this.clients.forEach(value => {
                value.disconnect();
            })
        };

        this.removeConnection = (connection) => {
            this.connections.forEach((value, key) => {
                if (value === connection) {
                    this.connections.delete(key);
                }
            })
        };

        this.removeServer = (url) => {
            if (this.clients.has(url)) {
                if (this.clients.get(url).state === this.clients.get(url).State.CONNECTED) {
                    this.clients.get(url).disconnect();
                }
                this.clients.delete(url);
            }
            if (this.onServerConnectedCallbacks.has(url)) {
                this.onServerConnectedCallbacks.delete(url);
            }
            this.connections.forEach((value, key) => {
                if (key.startsWith(url)) {
                    this.connections.delete(key);
                }
            })
        };

        // Start listening for RTC peer connections.
        this.addServer = (url, email, secret, connectedCallback, connectFailedCallback) => {

            if (connectedCallback) {
                this.onServerConnectedCallbacks.set(url, connectedCallback);
            }

            const client = new SignalingClient(this.WebSocketImplementation, url, email, secret);
            this.clients.set(url, client);

            client.onConnected = (id) => {
                this.onServerConnected(url, id);
                if (this.onServerConnectedCallbacks.has(url)) {
                    const onServerConnectedCallback  = this.onServerConnectedCallbacks.get(url);
                    if (onServerConnectedCallback) {
                        onServerConnectedCallback(url, id);
                    }
                    this.onServerConnectedCallbacks.delete(url);
                }
            };

            client.onConnectFailed = (error) => {
                console.log('Connect failed.');
                if (connectFailedCallback) {
                    connectFailedCallback(error);
                }
                this.onServerConnectFailed(error, url);
            };

            client.onTargetNotFound = (targetId, objectType, object) => {
                console.log('signaling channel (' + url + ') - target not found: ' + targetId + ' ' + objectType + ' ' + JSON.stringify(object));
                this.onTargetNotFound(url, targetId, objectType, object);
            };

            client.onInvalidMessage = (targetId, objectType, object) => {
                console.log('signaling channel (' + url + ') - on invalid message: ' + targetId + ' ' + objectType + ' ' + JSON.stringify(object));
            };


            client.onReceive = async (sourceId, objectType, object) => {

                try {
                    if (objectType === this.ObjectType.OFFER) {
                        const connection = this.onOffer(url, sourceId, object);

                        if (connection) {
                            this.connections.set(url + '/' + client.id + "-" + sourceId, connection);

                            connection.onicecandidate = async (candidate) => {
                                try {
                                    client.send(sourceId, this.ObjectType.ICE_CANDIDATE, candidate.candidate);
                                } catch (error) {
                                    console.warn('signaling channel (' + url + ') - on ice candidate: ' + error.message);
                                }
                            };

                            await connection.setRemoteDescription(object);
                            await connection.setLocalDescription(await connection.createAnswer());
                            client.send(sourceId, this.ObjectType.ANSWER, connection.localDescription);
                        }
                    }

                    if (objectType === this.ObjectType.ANSWER) {
                        const connection = this.connections.get(url + '/' + client.id + "-" + sourceId);
                        if (connection) {
                            await connection.setRemoteDescription(object);
                        }
                    }

                    if (objectType === this.ObjectType.ICE_CANDIDATE) {
                        if (object) {
                            if (this.connections.has(url + '/' + client.id + "-" + sourceId)) {
                                const connection = this.connections.get(url + '/' + client.id + "-" + sourceId);
                                if (connection) {
                                    connection.addIceCandidate(object);
                                }
                            }
                        }
                    }
                } catch(e) {
                    error('signaling channel (' + url + ') - on receive: error processing received object ' + objectType + ' ' + JSON.stringify(object) + ':' + e.message);
                }

            };

            client.onDisconnect = () => {
                this.onServerDisconnect(url);
                // Reconnect after 10 seconds.
                //console.log('signaling channel (' + url + ') - on disconnect: disconnected')
                if (this.autoReconnect) {
                    setTimeout(() => {
                        console.log('signaling channel (' + url + ') - on disconnect: auto reconnect enabled, attempting to reconnect');
                        client.connect();
                    }, 3000)
                }
            };

            client.onConnectionError = () => {
                this.onServerConnectionError(url)
            }

        };

        // Send offer to RTC peer
        this.offer = async (signalingServerUrl, peerId, connection) => {
            try {
                let client = this.clients.get(signalingServerUrl);
                await this.waitForClientToConnect(signalingServerUrl, client);

                this.connections.set(signalingServerUrl + '/' + client.id + "-" + peerId, connection);

                connection.onicecandidate = async (candidate) => {
                    try {
                        client.send(peerId, this.ObjectType.ICE_CANDIDATE, candidate.candidate);
                    } catch(error) {
                        console.warn('signaling channel (' + signalingServerUrl + ') - on ice candidate: ' + error.message);
                    }
                };

                connection.createOffer().then(async (offer) => {
                    try {
                        await connection.setLocalDescription(offer);
                        client.send(peerId, this.ObjectType.OFFER, connection.localDescription);
                    } catch(error) {
                        console.error('signaling channel (' + signalingServerUrl + ') - create offer: ' + error.message);
                    }
                })
            } catch(e) {
                error('signaling channel (' + signalingServerUrl + ') - offer : error sending offer to rtc peer: ' + e.message);
            }
        };

        this.waitForClientToConnect = async (signalingServerUrl, client) => {
            if (!client) {
                error('signaling channel (' + signalingServerUrl + ') - waiting for client to connect : not connected to signaling server');
            }

            let i = 0;
            while (client.state !== client.State.CONNECTED) {
                //console.log("offer waiting for client to connect: " + signalingServerUrl)
                await timeout(100);
                i++;
                if (i>50) {
                    error('signaling channel (' + signalingServerUrl + ') - waiting for client to connect : timed out');
                }
            }
        }

    }

};

function error(errorMessage) {
    console.error(errorMessage);
    throw new Error(errorMessage);
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
