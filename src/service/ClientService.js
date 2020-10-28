'use strict'

import {client} from "../index";

class ClientService {
    constructor() {
    }

    /**
     * 更新在线客户端列表
     * @param participants 该房间里的所有人
     * @param newcomer 发送join消息的客户端，即新加入的客户端
     */
    updateOnlinePeerList(participants, newcomer) {
        // 针对第一次加入房间的客户端,保存房间所有人。全量保存
        if (Object.keys(client.onlinePeer).length === 0) {
            for (let idx in participants) {
                client.addOnlinePeer(participants[idx].account, participants[idx])
                console.log(">>> ", new Date().toLocaleTimeString(), " [info] 新客户端加入: ", client.getOnlinePeer(participants[idx].account))
            }
        } else { // 增量保存
            client.addOnlinePeer(newcomer.account, newcomer)
            console.log(">>> ", new Date().toLocaleTimeString(), " [info] 新客户端加入: ", client.getOnlinePeer(newcomer.account))
        }
    }

}

export {ClientService}