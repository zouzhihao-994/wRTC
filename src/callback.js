'use strict'

// 回调函数
let callback = {
    /**
     * 房间里其他人发布本地流时
     * @return account:发布者的account
     */
    onPublisher: null,

    /**
     * 当频道里其他人取消发布本地流时
     * @return account 取消者的account
     */
    onUnPublisher: null,

    /**
     * 订阅远程流成功时触发stream
     * @return subscriber 远程流的参数
     * @return stream 远程的流
     */
    onMediaStream: null,


    /**
     * 房间有人离开时
     * @return account 离开者的account
     */
    onLeave: null

}