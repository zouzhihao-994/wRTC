'use strict';

import {client, socket, getRawPeerName, iceServer, screenSuffix, SCREEN_SHARE, AV_SHARE} from "../index";

/**
 * 创建OFFER
 *
 * @param account 对端的account
 * @param pc RTCPeerConnection {@link RTCPeerConnection}
 * @param client Client类 {@link Client}
 * @param socketServer SocketServer类
 * @param mediaType 视频类型，音视频{@link AV_SHARE} or 屏幕共享{@link SCREEN_SHARE}
 */
function createOffer(account, pc, client, socketServer, mediaType) {
    console.log(">>> send offer to", account)
    pc.createOffer({
        // offerToReceiveAudio:1,
        offerToReceiveVideo: 1
    }).then((desc) => {
        pc.setLocalDescription(desc, () => {
            console.log(">>> 设置local description")
            // 发送offer信息
            socketServer.emitOffer(account, pc.localDescription, client.roomId, mediaType)
        }, (err) => {
            console.log('create offer Error]', err)
        })
    })
}

/**
 * 和对端进行建立连接，然后输出本端的stream给对端
 * 具体的流程为：
 * 创建pc -> connection设置track监听 -> 设置ice监听 -> 设置onnegotiationneeded监听 -> 输出本端的流到pc中
 * @param account 对端的account
 * @param stream 要输出的流
 * @param mediaType 视频的类型 {@link SCREEN_SHARE} or {@link AV_SHARE}
 */
function createPCAndAddTracker(account, stream, mediaType) {
    // 创建pc
    let pc = new RTCPeerConnection(iceServer)
    // 设置track监听
    pc.ontrack = (event) => {
        if (event.streams) {
            socket.onScreenTrack(account, event.streams[0])
        }
    }
    // 设置ice监听
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emitIceCandidate(event.candidate, client.roomId, account, mediaType)
        }
    }
    // 设置negotiation监听
    pc.onnegotiationneeded = () => {
        createOffer(account, pc, client, socket, mediaType)
    }
    // 保存{peerName:pc}
    client.addPeer(account, pc)
    // 输出track
    try {
        client.localStream.getTracks().forEach(track => {
            // 设置监听onended事件
            track.onended = socket.onEnded
            // 添加远端
            pc.addTrack(track, client.localStream)
        })
    } catch (e) {
        console.error('share getDisplayMedia addTrack error', e);
    }
}

/**
 * 获取本地屏幕的图像
 * 然后添加screen stream track到所有对端pc中
 */
function getScreenMediaAndAddTrack() {
    navigator.mediaDevices.getDisplayMedia().then(stream => {
        // 设置本地流
        client.setLocalScreenStream(stream)
        // 将视频流发送到所有远端屏幕上
        for (let peerName in client.remoteScreen) {
            try {
                client.localScreenStream.getTracks().forEach(track => {
                    // 设置监听onended事件
                    track.onended = socket.onEnded
                    // 添加远端
                    client.remoteScreen[peerName].addTrack(track, client.localScreenStream)
                })
            } catch (e) {
                console.error('share getDisplayMedia addTrack error', e);
            }
        }
        return Promise.resolve(stream)
    })
}

export {createOffer, getScreenMediaAndAddTrack,createPCAndAddTracker}