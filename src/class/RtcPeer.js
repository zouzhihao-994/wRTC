'use strict';

import {client, socket, getRawPeerName, iceServer, screenSuffix, localScreen} from "../index";

/**
 * 创建OFFER
 *
 * @param peerName 对方peer的名称
 * @param pc RTCPeerConnection {@link RTCPeerConnection}
 * @param client Client类 {@link Client}
 * @param socketServer SocketServer类
 */
function createOffer(peerName, pc, client, socketServer) {
    console.log(pc, "create offer to", peerName)
    pc.createOffer({
        // offerToReceiveAudio:1,
        offerToReceiveVideo: 1
    }).then((desc) => {
        pc.setLocalDescription(desc, () => {
            console.log(peerName, "设置local description")
            // 发送offer信息
            socketServer.emitOffer(peerName, pc.localDescription, client.roomId)
        }, (err) => {
            console.log('create offer Error]', err)
        })
    })
}

/**
 * 创建屏幕共享连接对象pc，然后对pc添加监听器
 * @param p 对端peer {peerName,remoteScreen} {@link #Socket#onJoined peer变量}
 * @param client 客户端对象 {@class Client}
 * @param socketServer socket对象
 */
function createScreenConnection(p, client, socketServer) {
    let pc = new RTCPeerConnection(iceServer);

    // 如果检测到对方媒体流连接，将其绑定到一个video上
    pc.ontrack = (event) => {
        console.log("接收 track", pc)
        // 存在流
        if (event.streams) {
            console.log("存在stream", event)
            let screenStream = event.streams[0];
            let screenTrack = screenStream.getTracks()[0]
            try {
                let account = getRawPeerName(p.remoteScreenName.split(screenSuffix)[0], client.account)
                socketServer.onRemoteScreenStream({account: account, stream: screenStream})
            } catch (e) {
                console.error('[Caller error] onRemoteScreenStream', e)
            }
        }
    }

    // 发送ICE给其他客户端
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socketServer.emitIceCandidate(event.candidate, client.roomId, p.remoteScreenName)
        }
    }

    // 设置监听
    pc.onnegotiationneeded = () => {
        createOffer(p.remoteScreenName, pc, client, socketServer)
    }

    // 添加远端
    client.addRemoteScreen(p.remoteScreenName, pc)

}

/**
 * 创建对端pc，然后设置回调函数
 * @param p map类型 {peerName,remoteScreen} {@link #Socket#onJoined peer变量}
 * @param client 本客户端 {@link Client}
 * @param socketServer socket服务类
 */
function createPeerConnection(p, client, socketServer) {

    let pc = new RTCPeerConnection(iceServer);
    console.log("create peer connection ", pc)

    pc.ontrack = (event) => {
        if (event.streams) {
            socketServer.onTrack(p.peerName, event.streams[0])
        }
    }

    pc.onicecandidate = (event) => {
        console.log("接收到icecandidate", pc)
        if (event.candidate) {
            socketServer.emitIceCandidate(event.candidate, client.roomId, p.peerName)
        }
    }

    pc.onnegotiationneeded = () => {
        createOffer(p.peerName, pc, client, socketServer)
    }

    // 保存对端名称
    client.addPeer(p.peerName, pc)
    console.log("getPeerConnection ok")
}

/**
 * 获取本地屏幕的图像
 * 然后添加screen stream track到所有对端pc中
 */
function getScreenMediaAndAddTrack() {
    navigator.mediaDevices.getDisplayMedia().then(stream => {
        localScreen = stream;
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

export {createOffer, createScreenConnection, createPeerConnection, getScreenMediaAndAddTrack}