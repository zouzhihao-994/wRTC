'use strict';

import {client, socket, SCREEN_SHARE, AV_SHARE, iceServer} from "../index";

class RTCService{
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
                socket.emitOffer(account, pc.localDescription, client.roomId, mediaType)
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

        // 设置track监听
        pc.ontrack = (event) => {
            if (event.streams) {
                socket.onTrack(account, event.streams[0])
            }
        }
        // 设置negotiation监听
        pc.onnegotiationneeded = () => {
            console.log(">>> ", new Date().toLocaleTimeString(), " [收到]: ", account, "的 negotiationneeded 消息")
            this.createOfferHandle(account, pc, mediaType)
        }
        // 输出track
        try {
            stream.getTracks().forEach(track => {
                // 设置监听onended事件
                track.onended = socket.onEnded
                console.log(">>> ", new Date().toLocaleTimeString(), " [发送]: track 给", account)
                // 添加远端
                pc.addTrack(track, stream)
            })
        } catch (e) {
            console.error('share getDisplayMedia addTrack error', e);
        }
    }
}

export {RTCService}