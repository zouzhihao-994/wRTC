'use strict';
import io from 'socket.io-client';

class Socket {

    constructor(socketUrl, client) {
        this._socketServer = io.connect(socketUrl, {transports: ['websocket'], timeout: 9999999});
        this._client = client
    }

    get socketServer() {
        return this._socketServer;
    }

    // joined消息处理
    onJoin(data, account) {
        if (this._client.account === account) {

        }
    }

    toString() {
        console.log("socket: " + this._socketServer, "client: " + this._client);
    }

    emitJoin() {
        console.log("socket emit join msg")
        this.socketServer.emit('join', {roomId: this._client.roomId, account: this._client.account,})
    }


}

export {Socket}

