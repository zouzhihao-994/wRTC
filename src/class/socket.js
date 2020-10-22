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
        this._socketServer.on('joined', (data, account) => {
            this.onJoined(data, account)
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
                console.log("peer:", p)
                let peer = {}
                let arr = [p.account, this._client.account]
                peer.peerName = arr.sort().join('-')
                peer.remoteScreenName = peer.peerName + screenSuffix

                // 如果存在对端连接对象，本地创建音视频流PeerConnection对象进行连接
                // 前提需要有一个client进行share
                if (!this._client.existPeer(peer.peerName) && p.account !== this._client.account) {
                    getPeerConnection(peer, this._client, this._socketServer);
                }

                // 如果存在远端屏幕流，创建桌面共享流PeerConnection对象
                // 前提需要至少有一个client进行share
                if (!this._client.existRemoteScreen(peer.remoteScreenName) && p.account !== this._client.account) {
                    getScreenConnection(peer, this._client, this._socketServer);
                }
            })

            if (account === this._client.account) {
                for (let k in this._client.peer) {
                    createOffer(k, this._client.peer[k]);
                }
                // 创建共享桌面连接的offer
                for (let k in this._client.remoteScreen) {
                    createOffer(k, this._client.remoteScreen[k]);
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

    let peer = new RTCPeerConnection(iceServer);
    console.log("create peer connection ", p)

    // 如果检测到对方媒体流连接，将其绑定到一个video标签上输出
    // The RTCPeerConnection property ontrack is an EventHandler
    // which specifies a function to be called when the track  event occurs,
    // indicating that a track has been added to the RTCPeerConnection.
    peer.ontrack = (event) => {
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

    // 当收到icecandidate信息时将发送ice给房间的人
    p.onicecandidate = (event) => {
        if (event.candidate) {
            socketServer.emitIceCandidate(event.candidate, client.roomId, p.peerName)
        }
    }

    // 当发生协议变更时
    p.onnegotiationneeded = (event) => {
        createOffer(peer.peerName, p)
    }

    // 保存对端名称
    client.addPeer(peer.peerName, peer)
    console.log("getPeerConnection ok")
}

function getRawPeerName(str, account) {
    let names = str.split('-');
    return names[0] === account ? names[1] : names[0];
}

// peer加入时设置video
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

// 在收到自己Joined事件时,创建OFFER,
// peerName为对方的名字，peer为自己的RTCPeerConnection对象
function createOffer(peerName, peer) {
    console.log("create offer", peerName, peer)
}

function getScreenConnection(p, client, socketServer) {
    let peer = new RTCPeerConnection(iceServer);

    // 如果检测到对方媒体流连接，将其绑定到一个video上
    peer.ontrack = (event) => {
        // 存在流
        if (event.streams) {
            let screenStream = event.streams[0];
            let screenTrack = screenStream.getTracks()[0]
            screenTrack.onmute = e => {
                try {
                    client.onRemoveScreenStream && client.onRemoveScreenStream();
                } catch (e) {
                    console.error('[Caller error] onRemoveScreenStream,', error)
                }
            }
            try {
                let account = getRawPeerName(p.remoteScreenName.split(screenSuffix)[0], client.account)
                client.onRemoveScreenStream && client.onRemoveScreenStream(account, screenStream)
            } catch (e) {
                console.error('[Caller error] onRemoteScreenStream', e)
            }
        }

        // 发送ICE给其他客户端
        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socketServer.emitIceCandidate(event.candidate, client.roomId, p.remoteScreenName)
            }
        }

        // 设置监听
        peer.onnegotiationneeded = (event) => {
            createOffer(p.remoteScreenName, peer)
        }

        // 添加远端
        client.addRemoteScreen(p.remoteScreenName, peer)
    }


}

export {Socket}

