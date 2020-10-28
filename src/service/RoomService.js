'use strict'

import {client, rtcService, SCREEN_SHARE, AV_SHARE, socket} from "../index"

class RoomService {
    constructor() {
    }

    /**
     * 客户端加入房间
     * 更新roomId，然后向房间发送join广播消息,
     * 其他人会接收到{@link Socket#onJoined}消息
     */
    join(roomId) {
        client.setRoomId(roomId)
        socket.emitJoin()
    }

    /**
     * 推送流到房间中
     * @param stream 要推送的流
     * @param mediaType 要输出的视频类型 {@link SCREEN_SHARE} or {@link AV_SHARE}
     */
    subscribeStream(stream, mediaType) {
        return new Promise((resolve, reject) => {
            if (stream === undefined || stream === null) {
                return reject("stream is null")
            }

            if(mediaType === SCREEN_SHARE){
                client.setLocalScreenStream(stream)
            }else if(mediaType === AV_SHARE){
                client.setLocalAvStream(stream)
            }else{
                return reject("mediaType is not SCREEN_SHARE or AV_SHARE")
            }

            // createLocalVideo(AV_SHARE)
            for (let peerName in client.onlinePeer) {
                if (peerName === client.account) {
                    continue
                }
                // 创建pc，设置回调函数，添加track
                rtcService.createPCAndAddTrack(peerName, stream, mediaType)
            }

            // 发送屏幕共享事件到信令服务器，信令服务器会发送screenShared事件给account = peerName的客户端
            socket.emitScreenShare()
            resolve()
        })
    }


}

export {RoomService}