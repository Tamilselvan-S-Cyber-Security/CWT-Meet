const APP_ID = "8f61c340d00d408997dfa023554e1925";
const TOKEN = "007eJxTYDjn33arK/a27ZbKXuO8DZGX+QWDzVmy7ppwhJj2zNC+zqrAYJFmZphsbGKQYmCQYmJgYWlpnpKWaGBkbGpqkmpoaWRa5hKW3hDIyCAcJMzMyACBID4LQ3l+ThoDAwB4FBsv";
const CHANNEL = "wolf";
const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

let localTracks = [];
let remoteUsers = {};
let currentCameraId = null;  // Track current camera deviceId
let UID = null;

let joinAndDisplayLocalStream = async () => {
    client.on('user-published', handleUserJoined);
    client.on('user-left', handleUserLeft);

    UID = await client.join(APP_ID, CHANNEL, TOKEN, null);

    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();

    let player = `<div class="video-container" id="user-container-${UID}">
                        <div class="video-player" id="user-${UID}"></div>
                  </div>`;
    document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);

    localTracks[1].play(`user-${UID}`);

    await client.publish([localTracks[0], localTracks[1]]);
};

let joinStream = async () => {
    await joinAndDisplayLocalStream();
    document.getElementById('join-btn').style.display = 'none';
    document.getElementById('stream-controls').style.display = 'flex';
};

let handleUserJoined = async (user, mediaType) => {
    remoteUsers[user.uid] = user;
    await client.subscribe(user, mediaType);

    if (mediaType === 'video') {
        let player = document.getElementById(`user-container-${user.uid}`);
        if (player != null) {
            player.remove();
        }

        player = `<div class="video-container" id="user-container-${user.uid}">
                        <div class="video-player" id="user-${user.uid}"></div> 
                 </div>`;
        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);

        user.videoTrack.play(`user-${user.uid}`);
    }

    if (mediaType === 'audio') {
        user.audioTrack.play();
    }
};

let handleUserLeft = async (user) => {
    delete remoteUsers[user.uid];
    document.getElementById(`user-container-${user.uid}`).remove();
};

let leaveAndRemoveLocalStream = async () => {
    for (let i = 0; localTracks.length > i; i++) {
        localTracks[i].stop();
        localTracks[i].close();
    }

    await client.leave();
    document.getElementById('join-btn').style.display = 'block';
    document.getElementById('stream-controls').style.display = 'none';
    document.getElementById('video-streams').innerHTML = '';
};

let toggleMic = async (e) => {
    if (localTracks[0].muted) {
        await localTracks[0].setMuted(false);
        e.target.innerText = '🎙️ Mic On';
        e.target.style.backgroundColor = 'cadetblue';
    } else {
        await localTracks[0].setMuted(true);
        e.target.innerText = '🎙️ Mic Off';
        e.target.style.backgroundColor = '#EE4B2B';
    }
};

let toggleCamera = async (e) => {
    if (localTracks[1].muted) {
        await localTracks[1].setMuted(false);
        e.target.innerText = '📷 Camera On';
        e.target.style.backgroundColor = 'cadetblue';
    } else {
        await localTracks[1].setMuted(true);
        e.target.innerText = '📷 Camera Off';
        e.target.style.backgroundColor = '#EE4B2B';
    }
};

// Switch between front and back cameras
let switchCamera = async () => {
    // Get all video devices (cameras)
    const devices = await AgoraRTC.getDevices();

    // Filter video devices (cameras)
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    console.log('Video devices found:', videoDevices);

    if (videoDevices.length < 2) {
        console.log('Only one camera found, unable to switch.');
        return;
    }

    // Find the front and back cameras by checking the label
    const frontCamera = videoDevices.find(device => device.label.toLowerCase().includes('front'));
    const backCamera = videoDevices.find(device => device.label.toLowerCase().includes('back'));

    // Determine which camera to switch to
    let nextCamera = null;
    if (currentCameraId === backCamera?.deviceId) {
        nextCamera = frontCamera;
    } else if (currentCameraId === frontCamera?.deviceId) {
        nextCamera = backCamera;
    } else {
        // Default to back camera if none selected yet
        nextCamera = backCamera;
    }

    if (nextCamera) {
        // Stop the current camera and close it
        await localTracks[1].stop();
        await localTracks[1].close();

        // Switch to the new camera
        currentCameraId = nextCamera.deviceId;

        // Create a new camera track for the next camera
        localTracks[1] = await AgoraRTC.createCameraTrack({ cameraId: currentCameraId });

        // Play the new camera stream
        localTracks[1].play(`user-${UID}`);

        // Republish the new camera track
        await client.publish([localTracks[1]]);
    } else {
        console.log('No suitable camera found.');
    }
};

document.getElementById('join-btn').addEventListener('click', joinStream);
document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream);
document.getElementById('mic-btn').addEventListener('click', toggleMic);
document.getElementById('camera-btn').addEventListener('click', toggleCamera);
document.getElementById('switch-camera-btn').addEventListener('click', switchCamera);
