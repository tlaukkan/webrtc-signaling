const assert = require('assert');
const webrtc = require('wrtc');

describe('webrtc-peer-connection', function() {
    it('should connect and send message to peer', function(done) {
        const configuration = {iceServers: [{urls: 'stun:stun1.l.google.com:19302'}]};
        const pc1 = new webrtc.RTCPeerConnection(configuration);

        const pc2 = new webrtc.RTCPeerConnection(configuration);

        const channel1 = pc1.createDataChannel('chat');
        channel1.onopen = () => {
            console.log("channel.onopen")
            channel1.send("test");
        };
        channel1.onmessage = (event) => {
            console.log("channel.onmessage: " + event.data)
        };

        pc2.ondatachannel = (event) => {
            const channel2 = event.channel;
            channel2.onopen = () => {
                console.log("channel2.onopen")
            };
            channel2.onmessage = (event) => {
                console.log("channel2.onmessage: " + event.data)
                assert(event.data, 'test')
                pc1.close()
                pc2.close()
                done()
            };
        };

        pc1.onicecandidate = async (candidate) => {
            console.log("pc1.onicecandidate: " + JSON.stringify(candidate.candidate))
            await pc2.addIceCandidate(candidate.candidate);
        };

        pc1.createOffer().then(async (desc) => {
            try {
                console.log("offer begin...")
                await pc1.setLocalDescription(desc);
                console.log("pc1.offer: " + JSON.stringify(pc1.localDescription))
                await pc2.setRemoteDescription(pc1.localDescription);
                await pc2.setLocalDescription(await pc2.createAnswer());
                console.log("pc1.offer: " + JSON.stringify(pc2.localDescription))
                await pc1.setRemoteDescription(pc2.localDescription);
                console.log("offer end.")
            } catch (err) {
                console.error(err);
            }
        })

    })
})

