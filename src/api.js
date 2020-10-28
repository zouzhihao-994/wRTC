'use strict'
import {client, rtcService, socket, roomService, init, SCREEN_SHARE} from "./index"

/**
 * sdk 对外提供接口的整合类
 * 对外提供的所有能力都在这个类下
 */
class RtcApi {

    constructor() {
    }


    /**
     * 初始化客户端
     * @param option 初始化参数
     */
    init(option) {
        init(option)
    }

    /**
     * 客户端加入房间
     * @param roomId 加入房间
     */
    joinRoom(roomId) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [info]: join room ", roomId)
        roomService.join(roomId)
    }

    /**
     * 获取桌面流
     * @returns {Promise<>} resolve:桌面的流.reject:错误信息
     */
    getScreenStream() {
        return rtcService.getScreenStream()
    }


    /**
     * 离开房间
     */
    leaveRoom(account, roomId) {

    }

    /**
     * 播放视频
     * @param video dom组件
     * @param stream 要播放的流
     */
    play(video, stream) {
        video.scrObject = stream
    }

    /**
     * 推送屏幕流到到房间
     */
    publishScreen(screenStream) {
        return roomService.publishScreen(screenStream, SCREEN_SHARE)
    }

    publishVideo() {
    }

    publishAudio() {

    }


    /**
     * 停止推送屏幕流到房间
     */
    unPublishScreen() {
        return rtcService.closeShare(SCREEN_SHARE)
    }

    /**
     * 是否订阅远端音频流
     */
    configRemoteAudio() {

    }

    /**
     * 是否订阅远端相机流
     */
    configRemoteCameraTrack() {

    }

    /**
     * 是否订阅远端屏幕流
     */
    configRemoteScreenTrack() {

    }

    /**
     * 订阅远端流
     */
    subscribe() {

    }

    /**
     * 取消订阅远端流
     */
    unSubscribe() {

    }

    /**
     * 预览本地摄像头
     */
    startPreview() {

    }

    /**
     * 结束预览本地摄像头
     */
    stopPreview() {

    }

    onJoined() {

    }
}

export {
    RtcApi
}










