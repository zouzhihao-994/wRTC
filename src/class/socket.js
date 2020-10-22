'use strict';
import io from 'socket.io-client';

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
     * 初始化socket，主要任务是：
     * 1. 设置消息监听
     * 2.
     */
    init() {
        this._socketServer.on('joined', (data,account) => {this.onJoin(data,account)})
    }

    get socketServer() {
        return this._socketServer;
    }

    // 监听joined消息
    onJoin(data, account) {
        // 如果account是本客户端的，表示本机join成功
        if (this._client.account === account) {
            console.log("client 加入房间")
            this._client.joinSuccess()
        }



    }

    emitJoin() {
        console.log("socket emit join msg")
        this.socketServer.emit('join', {roomId: this._client.roomId, account: this._client.account,})
    }

    toString() {
        console.log("socket: " + this._socketServer, "client: " + this._client);
    }


}

export {Socket}

