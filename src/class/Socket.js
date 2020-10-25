'use strict';

import io from 'socket.io-client';
import {
    div,
    iceServer,
    SCREEN_SHARE,
    AV_SHARE,
    createVideoOutputStream
} from "../index";
import {createOffer} from "./RtcPeer";

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
        // 监听屏幕共享消息
        this._socketServer.on("screenShared", (account) => {
            this.onScreenShared(account)
        })
        // 监听音视频共享消息
        this._socketServer.on("avShared", (account) => {
            this.onAvShared(account)
        })

    }

    /**
     * 收到join请求时，将room中所有人的account保存
     * @param participants 该房间里的所有人
     * @param newcomer 发送join消息的客户端，即新加入的客户端
     */
    onJoined(participants, newcomer) {

        if (Object.keys(this._client.onlinePeer).length === 0) {
            // 添加在线peer信息
            for (let idx in participants) {
                this._client.addOnlinePeer(participants[idx].account, participants[idx])
                console.log("添加新的peer：", this._client.getOnlinePeer(participants[idx].account))
            }
        } else {
            this._client.addOnlinePeer(newcomer.account,newcomer)
            console.log("添加新的peer：", this._client.getOnlinePeer(newcomer.account))
        }

        // 发送
        if(this._client.localAvStream !== null){

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
     * 监听av shared消息
     * @param account
     */
    onAvShared(account) {
        if (account === this._client.account) {
            return;
        }
        console.log(">>> 音视频共享请求")

        let pc = new RTCPeerConnection(iceServer)
        pc.ontrack = (event) => {
            if (event.streams) {
                this.onScreenTrack(account, event.streams[0])
            }
        }
        // 设置ice监听
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.emitIceCandidate(event.candidate, this._client.roomId, account, AV_SHARE)
            }
        }
        // 设置negotiation监听
        pc.onnegotiationneeded = () => {
            createOffer(account, pc, client, this, AV_SHARE)
        }
        // 保存{peerName:pc}
        this._client.addPeer(account, pc)
    }

    /**
     * 监听offer消息
     * @param data 包含四个字段，
     */
    onOffer(data) {
        if (data.source === this._client.account) {
            return;
        }
        // 屏幕共享的形式
        console.log(">>> on offer : peer:", data, " client: ", this._client)
        if (data.mediaType === SCREEN_SHARE) {
            // data.source 是发送方的account,发送方也就是本端的对端
            this._client.remoteScreen[data.source] && this._client.remoteScreen[data.source].setRemoteDescription(data.sdp, () => {
                this._client.remoteScreen[data.source].createAnswer().then((desc) => {
                    this._client.remoteScreen[data.source].setLocalDescription(desc, () => {
                        this.emitAnswer(data.source, this._client.roomId, this._client.remoteScreen[data.source].localDescription, SCREEN_SHARE)
                    })
                })
            }, (err) => {
                console.error("setRemoteDescription error:", err);
            })
        } else { //音视频形式
            this._client.peer[data.source] && this._client.peer[data.source].setRemoteDescription(data.sdp, () => {
                this._client.peer[data.source].createAnswer().then(desc => {
                    this._client.peer[data.source].setLocalDescription(desc, () => {
                        this.emitAnswer(data.source, this._client.roomId, this._client.peer[data.source].localDescription, AV_SHARE)
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
        if (data.source === this._client.account) {
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
     * @param account 对端的account
     * @param screenStream 屏幕流
     */
    onScreenTrack(account, screenStream) {
        //let screenTrack = screenStream.getTracks()[0]
        //todo screenTrack.onmute = ;
        console.log(">>> 收到", account, "track")
        try {
            createVideoOutputStream({account: account, stream: screenStream})
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
        if (data.source === this._client.account) {
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
     * 发送音视频(av share)共享消息
     */
    emitAvShare() {
        console.log(">>> socket emit av share msg to room", this._client.roomId)
        this._socketServer.emit('avShare', {
            'account': this._client.account,
            'roomId': this._client.roomId,
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

