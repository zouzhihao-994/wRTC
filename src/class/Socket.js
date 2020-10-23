'use strict';

import io from 'socket.io-client';
import {div, screenSuffix, iceServer, localScreen, localStream, getRawPeerName} from "../index";
import {createOffer, getScreenConnection, getPeerConnection} from "./RtcPeer";

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
        for (let part in participants) {
            accountIdArr[part] = participants[part].account
            accounts = accounts + "," + accountIdArr[part]
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
                    if (!this._client.existPeer(peer.peerName)) {
                        getPeerConnection(peer, this._client, this);
                    }

                    // 与p进行屏幕流连接，前提是需要p有正在进行屏幕共享
                    if (!this._client.existRemoteScreen(peer.remoteScreenName)) {
                        getScreenConnection(peer, this._client, this);
                    }
                }
            })

            // 如果account是本client，给其他所有peer发送offer sdp
            if (account === this._client.account) {
                // p = peerName , peer[p] = peer
                for (let p in this._client.peer) {
                    console.log("send connect offer to", this._client.peer[p])
                    createOffer(p, this._client.peer[p], this._client, this);
                }
                // 创建共享桌面连接的offer
                for (let p in this._client.remoteScreen) {
                    console.log("send screen offer to", this._client.remoteScreen[p])
                    createOffer(p, this._client.remoteScreen[p], this._client, this);
                }
            }
        }
    }

    onOffer(peer) {
        // 屏幕共享的形式
        console.log("on offer : peer:", peer, " client: ", this._client)
        if (peer.peerName.endsWith(screenSuffix)) {
            this._client.remoteScreen[peer.peerName] && client.remoteScreen[peer.peerName].setRemoteDescription(peer.sdp, () => {
                try {
                    if (localScreen) {
                        localScreen.getTracks().forEach(track => {
                            client.remoteScreen[peer.peerName].addTrack(track, localScreen)
                        })
                    }
                } catch (e) {
                    console.error('take_offer event screen addTrack error', e);
                }
                this._client.remoteScreen[peer.peerName].createAnswer().then((desc) => {
                    this.client.remoteScreen[peer.peerName].setLocalDescription(desc, this._client.emitAnswer(peer))
                })
            }, (err) => {
                console.error("setRemoteDescription error:", err);
            })
        } else { //音视频形式
            this._client.peer[peer.peerName] && client.peer[peer.peerName].setRemoteDescription(peer.sdp, () => {

                try {
                    if (localScreen) {
                        localScreen.getTracks().forEach(track => {
                            this._client.peer[peer.peerName].addTrack(track, localStream)
                        })
                    }
                } catch (e) {
                    console.error('take_offer event localVideo addTrack error', e);
                }
                this._client.peer[peer.peerName].createAnswer().then(desc => {
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
        console.log("on answer peer ", peer)
        // 屏幕共享模式
        if (peer.peerName.endsWith(screenSuffix)) {
            client.remoteScreenName[peer.peerName] && client.remoteScreenName[peer.peerName].setRemoteDescription(peer.sdp, function () {
            }, (err) => {
                console.error('setRemoteDescription error:', err, v.peerName);
            })
        } else { // 音视频模式
            client.peer[peer.peerName] && client.peer[peer.peerName].setRemoteDescription(peer.sdp, function () {
            }, (err) => {
                console.error('setRemoteDescription error:', err, peer.peerName);
            })
        }
    }

    onTrack(p, event) {
        console.log("检测到pc存在数据流")
        let account = getRawPeerName(p.peerName, this._client.account)
        try {
            this.onPeerAddStream({account: account, stream: event.streams[0]})
        } catch (e) {
            console.error("[Caller error] onPeerAddStream", e)
        }

        // 存储对方的流
        this._client.addPeerStream(account, event.streams[0])
    }

    /**
     * 设置监听peerAddStream
     * 如果存在对应的video组件，将stream输出到该video上
     * 如果没有，新建一个video，然后将stream输出到video上
     * @param pc RTCPeerConnection对象 {@link RTCPeerConnection}
     *
     */
    onPeerAddStream(pc) {
        try {
            let existVideo = document.querySelector('video#' + pc.peerName);
            existVideo.srcObject = pc.stream;
        } catch (e) {
            let video = document.createElement("video");
            div.appendChild(video)
            video.srcObject = pc.stream;
            video.setAttribute("id", pc.account);
            video.setAttribute("width", "320");
            video.setAttribute("height", "240");
            video.setAttribute("autoplay", "");
            video.setAttribute("controls", "");
        }
    }

    onIceCandidate(peer, client) {
        console.log("on ice candidate peer ", peer)
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

    /**
     * 发送offer信息
     * @param peerName 对端peer name
     * @param pc RTCPeerConnection {@class RTCPeerConnection }
     * @param roomId 房间id
     */
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
        console.log("发送 icecandidate ", candidate)
        this._socketServer.emit('_ice_candidate', {
            'candidate': candidate,
            roomId: roomId,
            peerName: peerName
        })
    }

    emitUpdateState(state, account) {
        this._socketServer.emit('updateClientState', {
            reqAccount: account,
            targetAccount: state.account,
            type: state.type,
            value: state.value
        })
    }

    toString() {
        console.log("socket: " + this._socketServer, "client: " + this._client);
    }
}

export {Socket}

