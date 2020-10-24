'use strict';

import io from 'socket.io-client';
import {div, screenSuffix, getRawPeerName, screenDiv, iceServer, SCREEN_SHARE, AV_SHARE} from "../index";
import {createOffer, createScreenConnection, createPeerConnection} from "./RtcPeer";

/**
 * 提供与socket操作相关的接口。
 */
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
     * 初始化socket
     * 主要任务是：设置消息监听
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
        this._socketServer.on("ice_candidate", (data) => {
            this.onIceCandidate(data)
        })
        this._socketServer.on("screenShared", (account) => {
            this.onScreenShared(account)
        })

    }

    /**
     * 监听joined消息
     * @param participants 该房间的所有客户端信息
     * @param account 发送joined消息的客户端account
     */
    hidden_onJoined(participants, account) {
        // 只有一个人说明room只有本客户端一个端，不做任何处理
        if (participants.length === 1) {
            return
        }

        // 信令服务器返回的data是所有加入该房间的客户端信息
        let accountIdArr = []
        let accounts = ""
        for (let part in participants) {
            accountIdArr[part] = participants[part].account
            accounts = accounts + "," + accountIdArr[part]
        }
        console.log("room ", this._client.roomId, "的参与者id: ", accounts)

        participants.forEach(p => {
            if (p.account !== this._client.account) {
                // 保存两端连接的名称
                console.log("peer:", p)
                let peer = {}
                let arr = [p.account, this._client.account];
                peer.peerName = arr.sort().join('-');
                peer.remoteScreenName = peer.peerName + screenSuffix
                console.log("peerName:", peer.peerName, "peerScreenName:", peer.remoteScreenName)

                // 创建一个pc，负责连接本端与对端的音视频
                if (!this._client.existPeer(peer.peerName)) {
                    createPeerConnection(peer, this._client, this);
                }

                // 创建一个pc，负责连接本端与对端的屏幕共享
                if (!this._client.existRemoteScreen(peer.remoteScreenName)) {
                    createScreenConnection(peer, this._client, this);
                }
            }
        })

        // 如果account是本client，给其他所有peer发送offer sdp
        if (account === this._client.account) {
            // p = peerName , peer[p] = peer
            for (let p in this._client.peer) {
                console.log("send connect offer to", this._client.peer[p])
                createOffer(p, this._client.peer[p], this._client, this, AV_SHARE);
            }
            // 创建共享桌面连接的offer
            for (let p in this._client.remoteScreen) {
                console.log("send screen offer to", this._client.remoteScreen[p])
                createOffer(p, this._client.remoteScreen[p], this._client, this, SCREEN_SHARE);
            }
        }
    }

    /**
     * 收到join请求时，将room中所有人的account保存
     */
    onJoined(participants) {
        if (participants.length === 1) {
            return;
        }

        // 添加在线peer信息
        for (let idx in participants) {
            if (!this._client._onlinePeer.hasOwnProperty(participants[idx].account)) {
                this._client.addOnlinePeer(participants[idx].account, participants[idx])
                console.log("添加新的peer：", this._client.getOnlinePeer(participants[idx].account))
            }
        }

    }

    /**
     * 房间中有一端发起了屏幕共享请求
     * @param account 发起屏幕共享请求的account
     */
    onScreenShared(account) {
        // 不处理自己的screenShare消息
        if (account === this._client.account) {
            return;
        }
        console.log(">>> 收到屏幕共享请求")
        // 创建pc
        let pc = new RTCPeerConnection(iceServer)
        // 设置track监听
        pc.ontrack = (event) => {
            if (event.streams) {
                this.onScreenTrack(account, event.streams[0])
            }
        }
        // 设置ice监听
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.emitIceCandidate(event.candidate, this._client.roomId, account, SCREEN_SHARE)
            }
        }
        // 设置negotiation监听
        pc.onnegotiationneeded = () => {
            createOffer(account, pc, client, this, SCREEN_SHARE)
        }
        // 保存{peerName:pc}
        this._client.addRemoteScreen(account, pc)

    }

    /**
     * 监听offer消息
     * @param data 包含四个字段，
     */
    onOffer(data) {
        if(data.source === this._client.account){
            return;
        }
        // 屏幕共享的形式
        console.log(">>> on offer : peer:", data, " client: ", this._client)
        if (data.mediaType === SCREEN_SHARE) {
            // data.source 是发送方的account,发送方也就是本端的对端
            this._client.remoteScreen[data.source] && this._client.remoteScreen[data.source].setRemoteDescription(data.sdp, () => {
                try {
                    this._client.localScreenStream && this._client.localScreenStream.getTracks().forEach(track => {
                        this._client.remoteScreen[data.source].addTrack(track, this._client.localScreenStream)
                    })

                } catch (e) {
                    console.error('take_offer event screen addTrack error', e);
                }
                this._client.remoteScreen[data.source].createAnswer().then((desc) => {
                    this._client.remoteScreen[data.source].setLocalDescription(desc, () => {
                        this.emitAnswer(data.source, this._client.roomId, this._client.remoteScreen[data.source].localDescription,SCREEN_SHARE)
                    })
                })
            }, (err) => {
                console.error("setRemoteDescription error:", err);
            })
        } else { //音视频形式
            this._client.peer[data.source] && this._client.peer[data.source].setRemoteDescription(data.sdp, () => {
                try {
                    // 如果本地存在视频流，将视频流添加到对方pc中
                    if (this._client.localScreenStream) {
                        console.log("==添加本地stream到对方pc中==")
                        this._client.localScreenStream.getTracks().forEach(track => {
                            this._client.peer[data.source].addTrack(track, this._client.localStream)
                        })
                    }
                } catch (e) {
                    console.error('take_offer event localVideo addTrack error', e);
                }
                console.log("==准备发送emit==", this._client.peer[data.source])
                this._client.peer[data.source] && this._client.peer[data.source].createAnswer().then(desc => {
                    this._client.peer[data.source].setLocalDescription(desc, () => {
                        this.emitAnswer(data.source, this._client.roomId, this._client.peer[data.source].localDescription,AV_SHARE)
                    })
                })
            }, (err) => {
                console.error("setRemoteDescription error:", err)
            })
        }
    }

    /**
     * 监听ended消息
     */
    onEnded() {
        this._client.setLocalScreenStream(null)
        // 本地流设为null
        this._client.setLocalScreenStream(null)
        // todo 移除远端流

        let state = {account: this._client.account, type: 'screenMute', value: false}
        this.emitUpdateState(state, this._client.account)
    }

    /**
     * 监听answer消息
     * @param data
     */
    onAnswer(data) {
        if(data.source === this._client.account){
            return;
        }
        console.log(">>> 收到 answer", data)
        // 屏幕共享模式
        if (data.mediaType === SCREEN_SHARE) {
            this._client.remoteScreen[data.source] && this._client.remoteScreen[data.source].setRemoteDescription(data.sdp, function () {
            }, (err) => {
                console.error('setRemoteDescription error:', err, data.source);
            })
        } else { // 音视频模式
            this._client.peer[data.source] && this._client.peer[data.source].setRemoteDescription(data.sdp, function () {
            }, (err) => {
                console.error('setRemoteDescription error:', err, data.source);
            })
        }
    }

    /**
     * 监听track的消息
     * @param peerName
     * @param stream
     */
    onTrack(peerName, stream) {
        console.log("检测到pc存在数据流")
        let account = getRawPeerName(peerName, this._client.account)
        try {
            this.onPeerAddStream({account: account, stream: stream})
        } catch (e) {
            console.error("[Caller error] onPeerAddStream", e)
        }

        // 存储对方的流
        this._client.addPeerStream(account, stream)
    }

    /**
     * @param account 对端的account
     * @param screenStream 屏幕流
     */
    onScreenTrack(account, screenStream) {
        //let screenTrack = screenStream.getTracks()[0]
        //todo screenTrack.onmute = ;
        console.log(">>> 收到", account, "screen track")
        try {
            this.onRemoteScreenStream({account: account, stream: screenStream})
        } catch (e) {
            console.error('[Caller error] onRemoteScreenStream', e)
        }
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

    /**
     * 监听ice candidate
     *
     * @param data 对端的emitIceCandidate方法发送的请求内容 {@link emitIceCandidate}
     */
    onIceCandidate(data) {
        if(data.source === this._client.account){
            return;
        }
        console.log(">>> 收到 ice candidate", data)
        if (data.mediaType === SCREEN_SHARE) {
            if (data.candidate) {
                this._client.remoteScreen[data.source].addIceCandidate(data.candidate).catch((err) => {
                    console.error('addIceCandidate error:', err);
                })
            }
        } else {
            if (data.candidate) {
                this._client.peer[data.source].addIceCandidate(data.candidate).catch((err) => {
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

    /**
     * 发送join消息
     */
    emitJoin() {
        console.log("socket emit join msg")
        this._socketServer.emit('join', {roomId: this._client.roomId, account: this._client.account,})
    }

    /**
     * 发送offer信息
     * dest是对端的account，source是自己的account
     * @param peerName 对端peer name
     * @param localDescription 描述信息 {@link RTCPeerConnection#localDescription}
     * @param roomId 房间id
     * @param mediaType 视频的类型 {@link #SCREEN_SHARE} or {@link }
     */
    emitOffer(peerName, localDescription, roomId, mediaType) {
        console.log("socket emit sdp offer")
        this._socketServer.emit('offer', {
            'sdp': localDescription,
            'roomId': roomId,
            'dest': peerName,
            'source': this._client.account,
            'mediaType': mediaType
        })
    }

    /**
     * 本客户端发送screenShare事件
     */
    emitScreenShare() {
        console.log(">>> socket emit screen share msg to room ", this._client.roomId)
        this._socketServer.emit('screenShare', {
            account: this._client.account,
            roomId: this._client.roomId
        })

    }

    /**
     * 发送answer消息
     * @param dest 对方名称
     * @param roomId 房间id
     * @param localDescription 本地的描述信息
     * @param mediaType 视频类型，音视频{@link AV_SHARE} or 屏幕共享{@link SCREEN_SHARE}
     */
    emitAnswer(dest, roomId, localDescription, mediaType) {
        console.log(">>> 发送answer to account :", dest)
        this._socketServer.emit('answer', {
            'sdp': localDescription,
            'roomId': roomId,
            'dest': dest,
            'source': this._client.account,
            'mediaType': mediaType
        })
    }

    /**
     * 发送ice candidate消息
     *
     * @param candidate 要发送的candidate消息内容
     * @param roomId 房间id
     * @param account 对端的名称
     * @param mediaType 进行的视频类型 音视频类型{@link AV_SHARE} or 屏幕共享类型{@link SCREEN_SHARE}
     */
    emitIceCandidate(candidate, roomId, account, mediaType) {
        console.log(">>> 发送 icecandidate to account ", account)
        this._socketServer.emit('ice_candidate', {
            'candidate': candidate,
            'roomId': roomId,
            'dest': account,
            'source': this._client.account,
            'mediaType': mediaType
        })
    }

    /**
     * 发送update state消息
     * @param state
     * @param account
     */
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

