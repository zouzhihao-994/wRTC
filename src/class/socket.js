'use strict';

import io from 'socket.io-client';
import {screenSuffix, iceServer, localScreen, localStream} from "../index";

class Socket {

    /**
     * 构造函数，负责创建连接和保存client对象在Socket内部
     * @param socketUrl 要连接的信令服务器url
     * @param client client对象
     */
    constructor(socketUrl, client) {
        this._socketServer = io.connect(socketUrl, {transports: ['websocket'], timeout: 9999999});
        this._client = client
    }

    /**
     * 初始化socket，主要任务是：
     * 1. 设置消息监听
     * 2.
     */
    init() {
        // 监听joined
        this._socketServer.on('joined', (data, account) => {
            this.onJoined(data, account)
        })
        // 监听offer
        this._socketServer.on('offer', (data) => {
            this.onOffer(data, this._client)
        })
        // 监听answer
        this._socketServer.on("answer", (data, account) => {
            this.onAnswer(data, account)
        })
        // 监听iceCandidate
        this._socketServer.on("__ice_candidate", (data, account) => {
            this.onIceCandidate(data, account)
        })

    }

    // 监听joined消息
    onJoined(participants, account) {
        // 如果account是本客户端的，表示本机join成功
        if (this._client.account === account) {
            console.log("client 加入房间")
            this._client.setIsJoin(true)
        }

        // 信令服务器返回的data是所有加入该房间的客户端信息
        let accountIdArr = []
        let accounts = ""
        for (let idx in participants) {
            accountIdArr[idx] = participants[idx].account
            accounts = accounts + "," + accountIdArr[idx]
        }
        console.log("room ", this._client.roomId, "的参与者id: ", accounts)
        // 设置参与者
        this._client.setOnlineClient(accountIdArr)

        if (participants.length > 1) {
            participants.forEach(p => {
                if (p.account !== this._client.account) {
                    console.log("peer:", p)
                    let peer = {}
                    peer.peerName = p.account + '-' + this._client.account
                    peer.remoteScreenName = peer.peerName + screenSuffix
                    console.log("peerName:", peer.peerName, "peerScreenName:", peer.remoteScreenName)

                    // 尝试与p进行音视频连接，前提是需要p有正在进行音视频共享
                    if (this._client.existPeer(peer.peerName)) {
                        getPeerConnection(peer, this._client, this._socketServer);
                    }

                    // 与p进行屏幕流连接，前提是需要p有正在进行屏幕共享
                    if (this._client.existRemoteScreen(peer.remoteScreenName)) {
                        getScreenConnection(peer, this._client, this._socketServer);
                    }
                }
            })

            // 如果account是本client，给其他所有peer发送offer sdp
            if (account === this._client.account) {
                // p = peerName , peer[p] = peer
                for (let p in this._client.peer) {
                    console.log("send connect offer to", this._client.peer[p])
                    createOffer(p,this._client.peer[p], this._client, this);
                }
                // 创建共享桌面连接的offer
                for (let p in this._client.remoteScreen) {
                    console.log("send connect offer to", this._client.peer[p])
                    createOffer(p,this._client.remoteScreen[p], this._client, this);
                }
            }
        }
    }

    onOffer(peer, client) {
        // 屏幕共享的形式
        if (peer.peerName.endsWith(screenSuffix)) {
            client.remoteScreen[peer.peerName] && client.remoteScreen[peer.peerName].setRemoteDescription(peer.sdp, () => {
                try {
                    if (localScreen) {
                        localScreen.getTracks().forEach(track => {
                            client.remoteScreen[peer.peerName].addTrack(track, localScreen)
                        })
                    }
                } catch (e) {
                    console.error('take_offer event screen addTrack error', e);
                }
                client.remoteScreen[peer.peerName].createAnswer().then((desc) => {
                    client.remoteScreen[peer.peerName].setLocalDescription(desc, client.emitAnswer(peer))
                })
            }, (err) => {
                console.error("setRemoteDescription error:", err);
            })
        } else { //音视频形式
            client.peer[peer.peerName] && client.peer[peer.peerName].setRemoteDescription(peer.sdp, () => {
                try {
                    if (localScreen) {
                        localScreen.getTracks().forEach(track => {
                            client.peer[peer.peerName].addTrack(track, localStream)
                        })
                    }
                } catch (e) {
                    console.error('take_offer event localVideo addTrack error', e);
                }
                client.peer[peer.peerName].createAnswer().then(desc => {
                    client.peer[peer.peerName].setLocalDescription(desc, () => {
                        client.emitAnswer(peer)
                    })
                })
            }, (err) => {
                console.error("setRemoteDescription error:", err)
            })
        }
    }

    onAnswer(peer, client) {
        // 屏幕共享模式
        if (peer.peerName.endsWith(screenSuffix)) {
            client.remoteScreenName[peer.peerName] && client.remoteScreenName[peer.peerName].setRemoteDescription(peer.sdp, function () {
            }, (err) => {
                console.error('setRemoteDescription error:', err, v.peerName);
            })
        } else { // 音视频模式
            client.peer[peer.peerName] && client.peer[peerName].setRemoteDescription(peer.sdp, function () {
            }, (err) => {
                console.error('setRemoteDescription error:', err, peer.peerName);
            })
        }
    }

    onIceCandidate(peer, client) {
        if (peer.peerName.endsWith(screenSuffix)) {
            if (peer.candidate) {
                client.remoteScreen[peer.peerName] && client.remoteScreen[peer.peerName].addIceCandidate(peer.candidate).catch((err) => {
                    console.error('addIceCandidate error:', err);
                })
            }
        } else {
            if (peer.candidate) {
                client.peer[peer.peerName] && client.peer[peer.peerName].addIceCandidate(peer.candidate).catch((err) => {
                    console.error('addIceCandidate error:', err);
                });
            }
        }
    }

    emitJoin() {
        console.log("socket emit join msg")
        this._socketServer.emit('join', {roomId: this._client.roomId, account: this._client.account,})
    }

    emitOffer(peerName, pc, roomId) {
        console.log("socket emit sdp offer")
        this._socketServer.emit('offer', {
            'sdp': pc.localDescription,
            roomId: roomId,
            peerName: peerName
        })
    }

    emitAnswer(peer) {
        this._client.emit('answer', {
            'sdp': this._client.remoteScreen[peer.peerName].localDescription,
            roomId: this._client.roomId,
            peerName: peer.peerName
        })
    }

    emitIceCandidate(candidate, roomId, peerName) {
        this._socketServer.emit('_ice_candidate', {
            'candidate': candidate,
            roomId: roomId,
            peerName: peerName
        })
    }

    toString() {
        console.log("socket: " + this._socketServer, "client: " + this._client);
    }
}

// 获取对等方的连接以及设置一些回调函数
function getPeerConnection(p, client, socketServer) {

    let pc = new RTCPeerConnection(iceServer);
    console.log("create peer connection ", p)

    // 如果检测到对方媒体流连接，将其绑定到一个video标签上输出
    pc.ontrack = (event) => {
        if (event.streams) {
            let peerName = getRawPeerName(p.peerName, client.account)
            try {
                onPeerAddStream({account: peerName, stream: event.streams[0]})
            } catch (e) {
                console.error("[Caller error] onPeerAddStream", e)
            }

            // 存储对方的流
            client.addPeerStream(peerName, event.streams[0])
        }
    }

    // 发送icecandidate信息时给p
    p.onicecandidate = (event) => {
        if (event.candidate) {
            console.log("send onicecandidate to ", p)
            socketServer.emitIceCandidate(event.candidate, client.roomId, p.peerName)
        }
    }

    // 当发生协议变更时
    p.onnegotiationneeded = () => {
        createOffer(p.peerName,pc, client, socketServer)
    }

    // 保存对端名称
    client.addPeer(p.peerName, pc)
    console.log("getPeerConnection ok")
}

function getRawPeerName(str, account) {
    let names = str.split('-');
    return names[0] === account ? names[1] : names[0];
}

// 有peer加入时设置video
function onPeerAddStream(peer) {
    try {
        let existVideo = document.querySelector('video#' + peer.peerName);
        existVideo.srcObject = peer.stream;
    } catch (e) {
        let video = document.createElement("video");
        div.appendChild(video);
        video.srcObject = peer.stream;
        video.setAttribute("id", peer.account);
        video.setAttribute("width", "320");
        video.setAttribute("height", "240");
        video.setAttribute("autoplay", "");
        video.setAttribute("controls", "");
    }
}

/**
 * 在收到自己Joined事件时,创建OFFER
 * peer为自己的RTCPeerConnection对象
 *
 * @param peerName 对方peer的名称
 * @param pc RTCPeerConnection {@link RTCPeerConnection}
 * @param client Client类 {@link Client}
 * @param socketServer SocketServer类 {@link Socket}
 */
function createOffer(peerName, pc, client, socketServer) {
    console.log("create offer", pc)
    pc.createOffer({
        // offerToReceiveAudio:1,
        offerToReceiveVideo: 1
    }).then((desc) => {
        pc.setLocalDescription(desc, () => {
            socketServer.emitOffer(peerName, pc, client.roomId)
        }, (err) => {
            console.log('create offer Error]', err)
        })
    })
}

function getScreenConnection(p, client, socketServer) {
    let pc = new RTCPeerConnection(iceServer);

    // 如果检测到对方媒体流连接，将其绑定到一个video上
    pc.ontrack = (event) => {
        // 存在流
        if (event.streams) {
            let screenStream = event.streams[0];
            let screenTrack = screenStream.getTracks()[0]
            screenTrack.onmute = e => {
                try {
                    // todo share时设置remove srceen
                    client.onRemoveScreenStream && client.onRemoveScreenStream();
                } catch (e) {
                    console.error('[Caller error] onRemoveScreenStream,', error)
                }
            }
            try {
                let account = getRawPeerName(p.remoteScreenName.split(screenSuffix)[0], client.account)
                client.remoteScreenStream && client.addRemoteScreen(account, screenStream)
            } catch (e) {
                console.error('[Caller error] onRemoteScreenStream', e)
            }
        }

        // 发送ICE给其他客户端
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socketServer.emitIceCandidate(event.candidate, client.roomId, p.remoteScreenName)
            }
        }

        // 设置监听
        pc.onnegotiationneeded = (event) => {
            createOffer(p.peerName,pc, client, socketServer)
        }

        // 添加远端
        client.addRemoteScreen(p.remoteScreenName, pc)
    }


}

export {Socket}

