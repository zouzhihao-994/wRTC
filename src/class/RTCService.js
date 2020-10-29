'use strict';

import {client, socket, rtcService, callback} from "../index";
import {SCREEN_SHARE, AV_SHARE, iceServer} from "../const"

/**
 * 该类主要提供与RTC操作相关的接口
 */
class RTCService {
    constructor() {
    }

    /**
     * 加入房间
     * 更新roomId，然后向房间发送join广播消息,
     * 其他人会接收到{@link Socket#onJoined}消息
     */
    join(roomId) {
        client.setRoomId(roomId)
        socket.emitJoin()
    }

    /**
     * 离开房间
     */
    leave() {
        // 发送leave
        socket.emitLeaveRoom()
        // 清除pc
        for (let idx in client.remoteAvPC()) {
            this.delPcCallback(client.remoteAvPC(idx))
        }
        for (let idx in client.remoteScreenPC()) {
            this.delPcCallback(client.remoteScreenPC(idx))
        }

        client.clean()
    }

    /**
     * 获取桌面流
     * @returns {Promise<>} resolve:桌面流.reject:错误信息
     */
    getScreenStream() {
        return new Promise((resolve, reject) => {
            navigator.mediaDevices.getDisplayMedia().then(stream => {
                return resolve(stream)
            }).catch(e => {
                return reject("getDisplayMedia fail. ", e)
            })
        })
    }

    /**
     * 获取音视频流
     * @param option
     * @returns {Promise<>} resolve:音视频流.reject:错误信息
     */
    getAvScreenStream(option) {
        return new Promise((resolve, reject) => {
            if (option === undefined || option === null) {
                // 开启视频，不开启音频
                option = {audio: false, video: true}
            }
            navigator.mediaDevices.getUserMedia(option).then(stream => {
                return resolve(stream)
            }).catch(err => {
                return reject(err)
            })
        })
    }

    /**
     * 推送流到房间中
     * @param stream 要推送的流
     * @param mediaType 要输出的视频类型 {@link SCREEN_SHARE} or {@link AV_SHARE}
     */
    publishScreen(stream, mediaType) {
        return new Promise((resolve, reject) => {
            if (stream === undefined || stream === null) {
                return reject("stream is null")
            }

            if (mediaType === SCREEN_SHARE) {
                client.setLocalScreenStream(stream)
            } else if (mediaType === AV_SHARE) {
                client.setLocalAvStream(stream)
            } else {
                return reject("mediaType is not SCREEN_SHARE or AV_SHARE")
            }

            for (let peerName in client.onlinePeer) {
                if (peerName === client.account) {
                    continue
                }
                // 创建pc，设置回调函数
                rtcService.createPC(peerName, stream, mediaType).then(pc => {
                    // 添加track
                    rtcService.addTrackToPC(pc, stream, mediaType)
                }).catch(err => {
                    return reject(err)
                })
            }

            // 发送屏幕共享事件到信令服务器，信令服务器会发送screenShared事件给account = peerName的客户端
            socket.emitScreenShare()
            resolve()
        })
    }

    /**
     * 创建OFFER
     *
     * @param account 对端的account
     * @param pc RTCPeerConnection {@link RTCPeerConnection}
     * @param mediaType 视频类型，音视频{@link AV_SHARE} or 屏幕共享{@link SCREEN_SHARE}
     */
    createOfferHandle(account, pc, mediaType) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [info] create offer")
        pc.createOffer({
            // offerToReceiveAudio:1,
            offerToReceiveVideo: 1
        }).then((desc) => {
            pc.setLocalDescription(desc, () => {
                // 发送offer信息
                socket.emitOffer(account, pc.localDescription, mediaType)
            }, (err) => {
                console.log('create offer Error]', err)
            })
        })
    }

    /**
     * 创建一个peerConnection，然后输出向connection 中添加 stream
     * @param account 对端的account
     * @param stream 要输出的流
     * @param mediaType 视频的类型 {@link SCREEN_SHARE} or {@link AV_SHARE}
     */
    createPC(account, stream, mediaType) {
        console.log("create pc params , account {} ,stream {} ,mediaType {}", account, stream, mediaType)
        return new Promise((resolve, reject) => {
            try {
                // 创建pc
                let pc = new RTCPeerConnection(iceServer)

                // 保存account和pc的映射关系
                if (mediaType === AV_SHARE) {
                    client.addRemoteAvPC(account, pc);
                } else {
                    client.addRemoteScreenPC(account, pc)
                }

                // 设置negotiation监听
                pc.onnegotiationneeded = () => {
                    console.log(">>> ", new Date().toLocaleTimeString(), " [info] 收到 negotiationneeded 消息")
                    this.createOfferHandle(account, pc, mediaType)
                }

                return resolve(pc)
            } catch (err) {
                return reject(err)
            }
        })
    }

    /**
     * 添加stream到pc中
     */
    addTrackToPC(pc, stream, mediaType) {
        try {
            stream.getTracks().forEach(track => {
                console.log(">>> ", new Date().toLocaleTimeString(), " [info] add track to pc, ", pc)
                // 设置停止共享监听
                track.onended = event => {
                    console.log(">>> ", new Date().toLocaleTimeString(), " [info] Close Screen Share 消息")
                    this.closeShare(mediaType).then(() => {
                        callback.onUnLocalScreen()
                    }).catch(err => {
                        console.log(">>> ", new Date().toLocaleTimeString(), " [error] Close Screen fail, error = ", err)
                    })
                }
                // 添加远端
                pc.addTrack(track, stream)
            })
        } catch (e) {
            console.log(">>> ", new Date().toLocaleTimeString(), " [error] get stream's track fail,error =", e)
        }
    }

    /**
     * 清除pc
     * 清除设置的回调函数
     * @param pc 要清除的peerConnection
     */
    delPcCallback(pc) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [info] 清除 pc 的回调函数", pc)
        pc.ontrack = null
        pc.onicecandidate = null
    }

    /**
     * 本端关闭分享
     * @param mediaType 要关闭分享的类型 {@link SCREEN_SHARE} or {@link AV_SHARE}
     */
    closeShare(mediaType) {
        return new Promise((resolve, reject) => {
            // 发送closeScreenShare消息给所有收听者
            socket.emitCloseShare(mediaType)

            // 清除流
            if (mediaType === SCREEN_SHARE) {
                client.localScreenStream.getTracks().forEach(track => {
                    track.stop()
                    client.localScreenStream.removeTrack(track)
                })

                client.setLocalScreenStream(null)
            }

            if (client.localScreenStream === undefined || client.localScreenStream === null) {
                return resolve()
            } else {
                return reject("close ", mediaType, " fail")
            }

        })
    }

    /**
     * 停止接收远端视频流
     */
    stopSubscribeScreen() {
        return new Promise((resolve, reject) => {
            // 设置标志
            client.setIsSubscribeScreen(false)
            // 删除所有远端信息
            for (let i = client.screenSharingPeer.length - 1; i >= 0; i--) {
                this.delRemoteScreen(client.screenSharingPeer[i])
            }

            if (client.screenSharingPeer.length === 0) {
                return resolve
            } else {
                return reject
            }
        })

    }

    /**
     * 清除远端account的屏幕流相关数据
     * @param account 对端的account
     * @note 该方法主要提供给共享接收端调用，用于在共享端停止共享后，清除共享端的相关消息
     */
    delRemoteScreen(account) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [info] del remote screen: ", account, "的屏幕流")
        let pc = client.remoteScreenPC[account]
        this.delPcCallback(pc)
        client.delRemoteScreenPC(account)
        client.delScreenSharingPeer(account)
    }


}

export {RTCService}