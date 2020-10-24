'use strict';

import io from 'socket.io-client';
import {div, screenSuffix, localScreen, localStream, getRawPeerName, screenDiv} from "../index";
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
            this.onOffer(data)
        })
        // 监听answer
        this._socketServer.on("answer", (data) => {
            this.onAnswer(data)
        })
        // 监听iceCandidate
        this._socketServer.on("__ice_candidate", (data) => {
            this.onIceCandidate(data)
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
                    let arr = [p.account, this._client.account];
                    peer.peerName = arr.sort().join('-');
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
            this._client.remoteScreen[peer.peerName] && this._client.remoteScreen[peer.peerName].setRemoteDescription(peer.sdp, () => {
                try {
                    if (localScreen) {
                        localScreen.getTracks().forEach(track => {
                            this._client.remoteScreen[peer.peerName].addTrack(track, localScreen)
                        })
                    }
                } catch (e) {
                    console.error('take_offer event screen addTrack error', e);
                }
                this._client.remoteScreen[peer.peerName].createAnswer().then((desc) => {
                    console.log("=====", this._client.remoteScreen[peer.peerName])
                    this._client.remoteScreen[peer.peerName].setLocalDescription(desc, () => {
                        this.emitAnswer(peer.peerName, this._client.roomId, this._client.remoteScreen[peer.peerName].localDescription)
                    })
                })
            }, (err) => {
                console.error("setRemoteDescription error:", err);
            })
        } else { //音视频形式
            this._client.peer[peer.peerName] && this._client.peer[peer.peerName].setRemoteDescription(peer.sdp, () => {
                try {
                    // 如果本地存在视频流，将视频流添加到对方pc中
                    if (localScreen) {
                        console.log("==添加本地stream到对方pc中==")
                        localScreen.getTracks().forEach(track => {
                            this._client.peer[peer.peerName].addTrack(track, localStream)
                        })
                    }
                } catch (e) {
                    console.error('take_offer event localVideo addTrack error', e);
                }
                console.log("==准备发送emit==", this._client.peer[peer.peerName])
                this._client.peer[peer.peerName] && this._client.peer[peer.peerName].createAnswer().then(desc => {
                    this._client.peer[peer.peerName].setLocalDescription(desc, () => {
                        this.emitAnswer(peer.peerName, this._client.roomId, this._client.peer[peer.peerName].localDescription)
                    })
                })
            }, (err) => {
                console.error("setRemoteDescription error:", err)
            })
        }
        console.log('===on offer end===')
    }

    onAnswer(data) {
        console.log("on answer peer ", data)
        // 屏幕共享模式
        if (data.peerName.endsWith(screenSuffix)) {
            this._client.remoteScreen[data.peerName] && this._client.remoteScreen[data.peerName].setRemoteDescription(data.sdp, function () {
            }, (err) => {
                console.error('setRemoteDescription error:', err, data.peerName);
            })
        } else { // 音视频模式
            this._client.peer[data.peerName] && this._client.peer[data.peerName].setRemoteDescription(data.sdp, function () {
            }, (err) => {
                console.error('setRemoteDescription error:', err, data.peerName);
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

    onIceCandidate(peer) {
        console.log("收到 ice candidate", peer)
        if (peer.peerName.endsWith(screenSuffix)) {
            if (peer.candidate) {
                this._client.remoteScreen[peer.peerName].addIceCandidate(peer.candidate).catch((err) => {
                    console.error('addIceCandidate error:', err);
                })
            }
        } else {
            if (peer.candidate) {
                this._client.peer[peer.peerName].addIceCandidate(peer.candidate).catch((err) => {
                    console.error('addIceCandidate error:', err);
                });
            }
        }
    }

    /**
     * 创建一个video
     * @param peer map类型,包含两个字段 peerName,stream
     */
    onRemoteScreenStream(peer) {
        let video = document.createElement("video")
        screenDiv.appendChild(video)

        video.srcObject = peer.stream
        video.setAttribute("id", peer.peerName);
        video.setAttribute("width", "400");
        video.setAttribute("height", "300");
        video.setAttribute("autoplay", "");
        video.setAttribute("controls", "");

    }

    emitJoin() {
        console.log("socket emit join msg")
        this._socketServer.emit('join', {roomId: this._client.roomId, account: this._client.account,})
    }

    /**
     * 发送offer信息
     * @param peerName 对端peer name
     * @param localDescription 描述信息 {@link RTCPeerConnection#localDescription}
     * @param roomId 房间id
     */
    emitOffer(peerName, localDescription, roomId) {
        console.log("socket emit sdp offer")
        this._socketServer.emit('offer', {
            'sdp': localDescription,
            roomId: roomId,
            peerName: peerName
        })
    }

    /**
     * 发送answer
     * @param peerName 对方名称
     * @param roomId 房间id
     * @param localDescription 本地的描述信息
     */
    emitAnswer(peerName, roomId, localDescription) {
        console.log("发送answer：peerName:", peerName, "roomId:", roomId, "localDescription:", localDescription)
        this._socketServer.emit('answer', {
            'sdp': localDescription,
            roomId: roomId,
            peerName: peerName
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

