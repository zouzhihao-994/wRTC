'use strict'

import {client, socket} from "../index"

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



}

export {RoomService}