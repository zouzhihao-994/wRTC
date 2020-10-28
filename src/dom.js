'use strict'

// 绑定元素
let joinButton = document.getElementById("joinBtn")
let avButton = document.getElementById("avBtn")
let shareButton = document.getElementById("shareBtn");
let exitButton = document.getElementById("leaveBtn")
let accountInput = document.getElementById('account');
let roomInput = document.getElementById('room');
let remoteScreenDiv = document.querySelector('div#screenDiv');
let localVideoDiv = document.querySelector('div#videoDiv')

// 绑定事件
joinButton.addEventListener('click', joinHandler)
shareButton.addEventListener('click', screenShareHandler)
avButton.addEventListener('click', avShareHandler);
exitButton.addEventListener('click', leaveRoomHandle);