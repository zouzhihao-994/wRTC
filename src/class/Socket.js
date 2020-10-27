'use strict';

import io from 'socket.io-client';
import {
    iceServer,
    rtcService,
    SCREEN_SHARE,
    AV_SHARE,
    client,
    socket,
    createRemoteVideo,
    removeVideoElement
} from "../index";

/**
 * 提供与socket操作相关的接口。
 */
class Socket {

    /**
     * 构造函数，负责创建连接和保存client对象在Socket内部
     * @param socketUrl 要连接的信令服务器url
     */
    constructor(socketUrl) {
        this._socketServer = io.connect(socketUrl, {transports: ['websocket'], timeout: 9999999});
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
        this._socketServer.on("onCloseShare", (source, mediaType) => {
            this.onCloseShare(source, mediaType)
        })

    }

    /**
     * 收到join请求时，将room中所有人的account保存
     * @param participants 该房间里的所有人
     * @param newcomer 发送join消息的客户端，即新加入的客户端
     */
    onJoined(participants, newcomer) {
        // 针对第一次加入房间的客户端,保存房间所有人。全量保存
        if (Object.keys(client.onlinePeer).length === 0) {
            for (let idx in participants) {
                client.addOnlinePeer(participants[idx].account, participants[idx])
                console.log(">>> ", new Date().toLocaleTimeString(), " [新的peer]: ", client.getOnlinePeer(participants[idx].account))
            }
        } else { // 增量保存
            client.addOnlinePeer(newcomer.account, newcomer)
            console.log(">>> ", new Date().toLocaleTimeString(), " [新的peer]: ", client.getOnlinePeer(newcomer.account))
        }

        // 如果本端正在进行视频分享,输出stream给新加入者
        if (client.localAvStream !== null) {
            this.emitAvShareToAccount(newcomer.account)
            rtcService.createPCAndAddTrack(newcomer.account, client.localAvStream, AV_SHARE)
        }
        if (client.localScreenStream !== null) {
            this.emitScreenShareToAccount(newcomer.account)
            rtcService.createPCAndAddTrack(newcomer.account, client.localScreenStream, SCREEN_SHARE)
        }
    }

    /**
     * 房间中有一端发起了屏幕共享请求
     * @param account 发起屏幕共享请求的account
     */
    onScreenShared(account) {
        // 不处理自己的screenShare消息
        if (account === client.account) {
            return;
        }
        console.log(">>> ", new Date().toLocaleTimeString(), " [收到]: ", account, "的 Screen Share 消息")

        let pc = new RTCPeerConnection(iceServer)
        client.addRemoteScreenPC(account, pc)

        // 设置track监听
        pc.ontrack = (event) => {
            if (event.streams) {
                this.onTrack(account, event.streams[0], SCREEN_SHARE)
            }
        }

        // 设置ice监听
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.emitIceCandidate(event.candidate, account, SCREEN_SHARE)
            }
        }
    }

    /**
     * 监听av shared消息
     * @param account
     */
    onAvShared(account) {
        if (account === client.account) {
            return;
        }
        console.log(">>> ", new Date().toLocaleTimeString(), " [收到]: ", account, " 的 AV Share 消息")
        let pc = new RTCPeerConnection(iceServer)
        client.addRemoteAvPC(account, pc)

        // 监听对端的addTrack()事件
        pc.ontrack = (event) => {
            if (event.streams) {
                this.onTrack(account, event.streams[0], AV_SHARE)
            }
        }

        // 设置ice监听
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.emitIceCandidate(event.candidate, account, AV_SHARE)
            }
        }
    }

    /**
     * 监听closeShare消息
     * @param source 发送消息的account
     * @param mediaType 要关闭的视频类型 {@link SCREEN_SHARE} or {@link AV_SHARE}
     */
    onCloseShare(source, mediaType) {
        if (source === client.account) {
            return
        }
        console.log(">>> ", new Date().toLocaleTimeString(), " [收到]: ", source, " 的 close ", mediaType, " 消息")

        // 删除对应的remote video
        removeVideoElement(source + "_" + mediaType)

        // 移除对端的连接信息
        if (mediaType === SCREEN_SHARE) {
            let pc = client.remoteScreen[source]
            pc.ontrack = null
            pc.onicecandidate = null
            pc.close()
            client.delRemoteScreenPC(source)
        } else { // 关闭 av pc

        }
    }

    /**
     * 监听offer消息
     * @param data 包含四个字段，
     */
    onOffer(data) {
        if (data.source === client.account) {
            return;
        }
        // 屏幕共享的形式
        console.log(">>> ", new Date().toLocaleTimeString(), " [收到]: ", data.source, " 的 offer 消息")
        if (data.mediaType === SCREEN_SHARE) {
            // data.source 是发送方的account,发送方也就是本端的对端
            client.remoteScreen[data.source] && client.remoteScreen[data.source].setRemoteDescription(data.sdp, () => {
                client.remoteScreen[data.source].createAnswer().then((desc) => {
                    client.remoteScreen[data.source].setLocalDescription(desc, () => {
                        this.emitAnswer(data.source, client.roomId, client.remoteScreen[data.source].localDescription, SCREEN_SHARE)
                    }, (err) => {
                        console.log(">>> ", new Date().toLocaleTimeString(), " [错误]: setLocalDescription error , ", err)
                    })
                }, (err) => {
                    console.log(">>> ", new Date().toLocaleTimeString(), " [错误]: createAnswer error , ", err)
                })
            }, (err) => {
                console.log(">>> ", new Date().toLocaleTimeString(), " [错误]: setRemoteDescription error , ", err)
            })
        } else { //音视频形式
            client.remoteAvPC[data.source] && client.remoteAvPC[data.source].setRemoteDescription(data.sdp, () => {
                client.remoteAvPC[data.source].createAnswer().then(desc => {
                    client.remoteAvPC[data.source].setLocalDescription(desc, () => {
                        this.emitAnswer(data.source, client.roomId, client.remoteAvPC[data.source].localDescription, AV_SHARE)
                    })
                })
            }, (err) => {
                console.error("setRemoteDescription error:", err)
            })
        }
    }

    /**
     * 监听answer消息
     * @param data
     */
    onAnswer(data) {
        if (data.source === client.account) {
            return;
        }
        console.log(">>> ", new Date().toLocaleTimeString(), " [收到]: ", data.source, "的 answer 消息")
        // 屏幕共享模式
        if (data.mediaType === SCREEN_SHARE) {
            client.remoteScreen[data.source] && client.remoteScreen[data.source].setRemoteDescription(data.sdp, () => {
                // 设置ice监听
                client.remoteScreen[data.source].remoteScreen = (event) => {
                    console.log(">>> ", new Date().toLocaleTimeString(), " [收到]: ", data.source, "的 icecandidate 消息")
                    if (event.candidate) {
                        socket.emitIceCandidate(event.candidate, data.source, data.mediaType)
                    }
                }
            }, (err) => {
                console.error('setRemoteDescription error:', err, data.source);
            })
        } else { // 音视频模式
            client.remoteAvPC[data.source] && client.remoteAvPC[data.source].setRemoteDescription(data.sdp, () => {
                // 设置ice监听
                client.remoteAvPC[data.source].onicecandidate = (event) => {
                    console.log(">>> ", new Date().toLocaleTimeString(), " [收到]: ", data.source, "的 icecandidate 消息")
                    if (event.candidate) {
                        socket.emitIceCandidate(event.candidate, data.source, data.mediaType)
                    }
                }
            }, (err) => {
                console.error('setRemoteDescription error:', err, data.source);
            })
        }
    }

    /**
     * @param account 对端的account
     * @param screenStream 屏幕流
     * @param mediaType 要输出的视频类型 {@link SCREEN_SHARE} or {@link AV_SHARE}
     */
    onTrack(account, screenStream, mediaType) {
        if (account === client.account) {
            return
        }
        //let screenTrack = screenStream.getTracks()[0]
        //todo screenTrack.onmute = ;
        console.log(">>> ", new Date().toLocaleTimeString(), " [收到]: ", account, "的 track")
        try {
            createRemoteVideo(account, screenStream, mediaType)
        } catch (e) {
            console.error('[Caller error] onRemoteScreenStream', e)
        }
    }

    /**
     * 监听ice candidate
     *
     * @param data 对端的emitIceCandidate方法发送的请求内容 {@link emitIceCandidate}
     */
    onIceCandidate(data) {
        if (data.source === client.account) {
            return
        }
        console.log(">>> ", new Date().toLocaleTimeString(), " [收到]: ", data.source, " 发送的ice candidate", data)
        if (data.mediaType === SCREEN_SHARE) {
            if (data.candidate) {
                client.remoteScreen[data.source].addIceCandidate(data.candidate).catch((err) => {
                    console.error('addIceCandidate error:', err);
                })
            }
        } else {
            if (data.candidate) {
                client.remoteAvPC[data.source].addIceCandidate(data.candidate).catch((err) => {
                    console.error('addIceCandidate error:', err);
                });
            }
        }
    }

    /**
     * 发送join消息
     */
    emitJoin() {
        console.log(">>> ", new Date().toLocaleTimeString(), " [发送] join 广播消息到信令服务器")
        this._socketServer.emit('join', {roomId: client.roomId, account: client.account,})
    }

    /**
     * 发送停止分享的广播消息
     * 停止分享本客户端mediaType类型的视频给房间所有人
     * @param mediaType 要关闭分享的类型 {@link SCREEN_SHARE} or {@link AV_SHARE}
     */
    emitCloseShare(mediaType) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [发送] close ", mediaType, " 广播消息到信令服务器,room = ", client.roomId)
        this._socketServer.emit('closeShare', {
            'roomId': client.roomId,
            'source': client.account,
            'mediaType': mediaType
        })
    }

    /**
     * 发送offer信息
     * dest是对端的account，source是自己的account
     * @param dest 对端的account
     * @param localDescription 描述信息 {@link RTCPeerConnection#localDescription}
     * @param mediaType 要关闭分享的类型 {@link SCREEN_SHARE} or {@link AV_SHARE}
     */
    emitOffer(dest, localDescription, mediaType) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [发送]: offer 到信令服务器 , {dest: ", dest, "}")
        this._socketServer.emit('offer', {
            'sdp': localDescription,
            'roomId': client.roomId,
            'dest': dest,
            'source': client.account,
            'mediaType': mediaType
        })
    }

    /**
     * 发送音视频(av share)共享消息
     */
    emitAvShare() {
        console.log(">>> ", new Date().toLocaleTimeString(), " [发送]: Av Share 广播消息到信令服务器")
        this._socketServer.emit('avShare', {
            'account': client.account,
            'roomId': client.roomId,
        })
    }

    emitAvShareToAccount(dest) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [发送]: Av Share 消息到信令服务器 , dest:", dest)
        this._socketServer.emit('avShareToAccount', {
            'dest': dest,
            'source': client.account
        })
    }

    emitScreenShareToAccount(dest) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [发送]: Screen Share 消息到信令服务器 , dest:", dest)
        this._socketServer.emit('screenShareToAccount', {
            'dest': dest,
            'source': client.account
        })
    }

    /**
     * 本客户端发送screenShare事件
     */
    emitScreenShare() {
        console.log(">>> ", new Date().toLocaleTimeString(), " [发送]: Screen Share 广播消息到信令服务器")
        this._socketServer.emit('screenShare', {
            account: client.account,
            roomId: client.roomId
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
        console.log(">>> ", new Date().toLocaleTimeString(), " [发送]: answer 到信令服务器,{dest: ", dest, "} {mediaType: ", mediaType, "}")
        this._socketServer.emit('answer', {
            'sdp': localDescription,
            'roomId': roomId,
            'dest': dest,
            'source': client.account,
            'mediaType': mediaType
        })
    }

    /**
     * 发送ice candidate消息
     *
     * @param candidate 要发送的candidate消息内容
     * @param account 对端的名称
     * @param mediaType 进行的视频类型 音视频类型{@link AV_SHARE} or 屏幕共享类型{@link SCREEN_SHARE}
     */
    emitIceCandidate(candidate, account, mediaType) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [发送]: icecandidate 到信令服务器,{dest", account, "} {mediaType:", mediaType, "}")
        this._socketServer.emit('ice_candidate', {
            'candidate': candidate,
            'roomId': client.roomId,
            'dest': account,
            'source': client.account,
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
        console.log("socket: " + this._socketServer, "client: " + client);
    }
}

export {Socket}

