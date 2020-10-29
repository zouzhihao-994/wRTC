'use strict'

/**
 * 需要监听使用哪一个回调能力，覆写对应的方法即可
 * 默认方法都为日志打印
 */
let callback = {

    /**
     * 房间有新人加入
     * @param account
     */
    onJoin: function (account) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [info] callback -> onJoin, account = ", account)
    },

    /**
     * 本地取消屏幕共享
     * 在用户点击浏览器的停止共享按钮时触发时候
     */
    onUnLocalScreen: function () {
        console.log(">>> ", new Date().toLocaleTimeString(), " [info] callback -> onUnLocalScreenStream")
    },

    /**
     * 订阅远程流成功时触发stream
     * @return subscriber 远程流的参数
     * @return stream 远程的流
     */
    onAudioTrack: null,

    onVideoTrack: null,

    /**
     * 房间有新的远程屏幕流
     * @param account 发起者account
     * @param stream 屏幕流
     */
    onScreenStream: function (account, stream) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [info] callback -> onScreenTrack, account = {},stream = {}", account, stream)
    },

    /**
     * 房间中有人发起屏幕分享请求
     * @param account
     */
    onScreenShared: function (account) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [info] callback -> onScreenShared, account = ", account)
    },

    /**
     * 有人取消屏幕分享
     * @param account
     */
    onUnScreenShared: function (account) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [info] callback -> onScreenShared, account = ", account)
    },

    /**
     * 房间有人离开时
     * @return account 离开者的account
     */
    onLeave: function (account) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [info] callback -> onLeave, account = {}, stream = {}", account)
    }

}

export {callback}