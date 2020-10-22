'use strict';
import io from 'socket.io-client';

/**
 * 客户端对象，负责保存客户端基本信息与提供相关方法
 */
class Client {
    constructor(account, roomId, token, url) {
        this._account = account;
        this._roomId = roomId;
        this._token = token
        this._socketUrl = url
    }

    get account() {
        return this._account;
    }

    get roomId() {
        return this._roomId;
    }

    get token() {
        return this._token;
    }

    get socketUrl() {
        return this._socketUrl;
    }

    toString() {
        console.log("account:", this._account, "roomId:", this._roomId, "token:", "socketUrl:", this._socketUrl)
    }
}

export {Client}