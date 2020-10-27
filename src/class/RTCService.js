'use strict';

import {client, socket, SCREEN_SHARE, AV_SHARE, iceServer, removeVideoElement, rtcService} from "../index";

class RTCService {
    constructor() {
    }

    /**
     * 创建OFFER
     *
     * @param account 对端的account
     * @param pc RTCPeerConnection {@link RTCPeerConnection}
     * @param mediaType 视频类型，音视频{@link AV_SHARE} or 屏幕共享{@link SCREEN_SHARE}
     */
    createOfferHandle(account, pc, mediaType) {
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
     * 和对端进行建立连接，然后输出本端的stream给对端
     * 具体的流程为：1.创建pc -> 2.connection设置track监听 -> 3.设置ice监听 -> 4.设置onnegotiationneeded监听 -> 5.输出本端的流到pc中
     * @param account 对端的account
     * @param stream 要输出的流
     * @param mediaType 视频的类型 {@link SCREEN_SHARE} or {@link AV_SHARE}
     */
    createPCAndAddTrack(account, stream, mediaType) {
        // 创建pc
        let pc = new RTCPeerConnection(iceServer)

        // 保存account和pc的映射关系
        if (mediaType === AV_SHARE) {
            console.log(">>> ", new Date().toLocaleTimeString(), " [保存]: 保存 AV PC , account: ", account)
            client.addRemoteAvPC(account, pc);
        } else {
            console.log(">>> ", new Date().toLocaleTimeString(), " [保存]: 保存 Screen PC , account: ", account)
            client.addRemoteScreenPC(account, pc)
        }

        // 设置negotiation监听
        pc.onnegotiationneeded = () => {
            console.log(">>> ", new Date().toLocaleTimeString(), " [收到]: ", account, "的 negotiationneeded 消息")
            this.createOfferHandle(account, pc, mediaType)
        }

        // 输出track
        try {
            stream.getTracks().forEach(track => {
                console.log(">>> ", new Date().toLocaleTimeString(), " [发送]: track 给", account)
                // 设置停止共享监听
                track.onended = event => {
                    console.log(">>> ", new Date().toLocaleTimeString(), " [收到]: ", account, "的 Close Screen Share 消息")
                    rtcService.closeShare(mediaType)
                    console.log(">>> ", new Date().toLocaleTimeString(), " [收到]: event = ", event)
                }
                // 添加远端
                pc.addTrack(track, stream)
            })
        } catch (e) {
            console.error('share getDisplayMedia addTrack error', e);
        }
    }

    /**
     * 本端关闭分享
     * @param mediaType 要关闭分享的类型 {@link SCREEN_SHARE} or {@link AV_SHARE}
     */
    closeShare(mediaType) {
        if (client.localScreenStream === null) {
            console.log(">>> ", new Date().toLocaleTimeString(), " [warn]: 当前没有进行 Screen 分享,无法关闭")
            return false
        }

        // 发送closeScreenShare消息给所有收听者
        socket.emitCloseShare(mediaType)

        // 停止
        if (mediaType === SCREEN_SHARE) {
            this.delScreenStream()
        } else {
        }

        // 删除local video
        removeVideoElement(mediaType)

        return true
    }

    /**
     * 清除stream
     * 1.关闭track -> 2.关闭stream -> 3.设置null
     */
    delScreenStream() {
        client.localScreenStream.getTracks().forEach(track => {
            track.stop()
            client.localScreenStream.removeTrack(track)
        })

        client.setLocalScreenStream(null)
    }

}

export {RTCService}