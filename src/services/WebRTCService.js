class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.onCallStateChange = null;
    this.onRemoteStream = null;
    this.onCallEnded = null;
    
    // Google STUN servers
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ];
  }

  // Initialize peer connection
  async createPeerConnection(cameraId = null, microphoneId = null) {
    try {
      this.peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });
      
      // Get local audio and video stream with specific devices
      console.log('Requesting camera and microphone access...')
      console.log('Selected camera:', cameraId)
      console.log('Selected microphone:', microphoneId)
      
      let constraints = {
        audio: microphoneId ? { deviceId: { exact: microphoneId } } : true,
        video: cameraId ? { 
          deviceId: { exact: cameraId },
          width: { ideal: 640 },
          height: { ideal: 480 }
        } : {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      };
      
      console.log('Using constraints:', JSON.stringify(constraints, null, 2))
      
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Media stream obtained with specific devices')
      } catch (videoError) {
        console.warn('❌ Failed with specific device constraints:', videoError)
        console.warn('Trying basic video constraints...')
        
        // Try with basic video constraints
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
          });
          console.log('✅ Media stream obtained with basic constraints')
        } catch (basicError) {
          console.warn('❌ Failed with basic video, trying audio only:', basicError)
          
          // Last resort: audio only
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });
          console.log('✅ Media stream obtained (audio only)')
        }
      }
      
      console.log('Media stream obtained successfully:', this.localStream)
      console.log('Video tracks:', this.localStream.getVideoTracks())
      console.log('Audio tracks:', this.localStream.getAudioTracks())
      
      // Check if video track is enabled
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (videoTrack) {
        console.log('Video track enabled:', videoTrack.enabled)
        console.log('Video track readyState:', videoTrack.readyState)
        console.log('Video track settings:', videoTrack.getSettings())
        console.log('Video track constraints:', videoTrack.getConstraints())
        
        // Enable the video track if it's disabled
        if (!videoTrack.enabled) {
          console.log('Enabling video track...')
          videoTrack.enabled = true
        }
      } else {
        console.warn('⚠️ No video track found in stream')
      }
      
      // Check if audio track is enabled
      const audioTrack = this.localStream.getAudioTracks()[0]
      if (audioTrack) {
        console.log('Audio track enabled:', audioTrack.enabled)
        console.log('Audio track readyState:', audioTrack.readyState)
        console.log('Audio track settings:', audioTrack.getSettings())
        
        // Enable the audio track if it's disabled
        if (!audioTrack.enabled) {
          console.log('Enabling audio track...')
          audioTrack.enabled = true
        }
      } else {
        console.warn('⚠️ No audio track found in stream')
      }
      
      // Add local stream to peer connection
      this.localStream.getTracks().forEach(track => {
        console.log('Adding track to peer connection:', track.kind, track.enabled, track.readyState)
        this.peerConnection.addTrack(track, this.localStream);
      });
      
      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('Remote track received:', event.track.kind)
        console.log('Remote track enabled:', event.track.enabled)
        console.log('Remote track readyState:', event.track.readyState)
        console.log('Remote stream:', event.streams[0])
        this.remoteStream = event.streams[0];
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
      };
      
      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          if (this.onCallStateChange) {
            this.onCallStateChange('ice-candidate', event.candidate);
          }
        }
      };
      
      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', this.peerConnection.connectionState);
        if (this.onCallStateChange) {
          this.onCallStateChange('connection-state', this.peerConnection.connectionState);
        }
      };
      
      // Handle ICE connection state changes - only end call if we're actually in a call
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', this.peerConnection.iceConnectionState);
        
        // Only end call if we have a remote description (meaning we're in an active call)
        if (this.peerConnection.remoteDescription && 
            (this.peerConnection.iceConnectionState === 'disconnected' || 
             this.peerConnection.iceConnectionState === 'failed')) {
          console.log('ICE connection failed, ending call');
          this.endCall();
        }
      };
      
      return true;
    } catch (error) {
      console.error('Failed to create peer connection:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      
      // Handle specific permission errors
      if (error.name === 'NotAllowedError') {
        console.error('Camera/microphone permission denied by user');
        alert('Please allow camera and microphone access to use video calls');
      } else if (error.name === 'NotFoundError') {
        console.error('No camera/microphone found');
        alert('No camera or microphone found on this device');
      } else if (error.name === 'NotReadableError') {
        console.error('Camera/microphone is busy');
        alert('Camera or microphone is being used by another application');
      } else if (error.name === 'OverconstrainedError') {
        console.error('Device constraints not satisfied');
        alert('Selected camera/microphone is not available. Please try different devices.');
      }
      
      return false;
    }
  }

  // Create and send offer
  async createOffer(toUserId, cameraId = null, microphoneId = null) {
    try {
      if (!this.peerConnection) {
        const success = await this.createPeerConnection(cameraId, microphoneId);
        if (!success) return null;
      }
      
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      return {
        type: 'OFFER',
        fromUserId: null, // Will be set by the caller
        toUserId: toUserId,
        callId: this.generateCallId(),
        sdp: offer.sdp
      };
    } catch (error) {
      console.error('Failed to create offer:', error);
      return null;
    }
  }

  // Handle incoming offer
  async handleOffer(offer, cameraId = null, microphoneId = null) {
    try {
      if (!this.peerConnection) {
        const success = await this.createPeerConnection(cameraId, microphoneId);
        if (!success) return null;
      }
      
      console.log('Handling incoming offer from:', offer.fromUserId)
      
      // Create RTCSessionDescription with proper type and SDP
      const sessionDescription = new RTCSessionDescription({
        type: 'offer',
        sdp: offer.sdp
      })
      
      await this.peerConnection.setRemoteDescription(sessionDescription);
      console.log('Remote description set successfully')
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('Answer created successfully')
      
      return {
        type: 'ANSWER',
        fromUserId: null, // Will be set by the callee
        toUserId: offer.fromUserId,
        callId: offer.callId,
        sdp: answer.sdp
      };
    } catch (error) {
      console.error('Failed to handle offer:', error);
      return null;
    }
  }

  // Handle incoming answer
  async handleAnswer(answer) {
    try {
      if (this.peerConnection) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription({
          type: 'answer',
          sdp: answer.sdp
        }));
      }
    } catch (error) {
      console.error('Failed to handle answer:', error);
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(candidate) {
    try {
      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Failed to handle ICE candidate:', error);
    }
  }

  // End call
  endCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    this.remoteStream = null;
    
    if (this.onCallEnded) {
      this.onCallEnded();
    }
  }

  // Generate unique call ID
  generateCallId() {
    return 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Get local stream
  getLocalStream() {
    return this.localStream;
  }

  // Get remote stream
  getRemoteStream() {
    return this.remoteStream;
  }

  // Set callbacks
  setCallbacks(onCallStateChange, onRemoteStream, onCallEnded) {
    this.onCallStateChange = onCallStateChange;
    this.onRemoteStream = onRemoteStream;
    this.onCallEnded = onCallEnded;
  }
  
  // Debug method to list available cameras
  async listCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('Available cameras:', videoDevices);
      return videoDevices;
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      return [];
    }
  }
  
  // Test media stream independently
  async testMediaStream(cameraId = null, microphoneId = null) {
    try {
      console.log('🧪 Testing media stream...')
      console.log('Test camera ID:', cameraId)
      console.log('Test microphone ID:', microphoneId)
      
      const constraints = {
        audio: microphoneId ? { deviceId: { exact: microphoneId } } : true,
        video: cameraId ? { 
          deviceId: { exact: cameraId },
          width: { ideal: 640 },
          height: { ideal: 480 }
        } : true
      };
      
      console.log('Test constraints:', JSON.stringify(constraints, null, 2))
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('✅ Test stream created successfully')
      console.log('Test video tracks:', stream.getVideoTracks())
      console.log('Test audio tracks:', stream.getAudioTracks())
      
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        console.log('Test video track enabled:', videoTrack.enabled)
        console.log('Test video track readyState:', videoTrack.readyState)
        console.log('Test video track settings:', videoTrack.getSettings())
      }
      
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        console.log('Test audio track enabled:', audioTrack.enabled)
        console.log('Test audio track readyState:', audioTrack.readyState)
        console.log('Test audio track settings:', audioTrack.getSettings())
      }
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop())
      console.log('🧪 Test stream stopped')
      
      return true;
    } catch (error) {
      console.error('❌ Test media stream failed:', error)
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      return false;
    }
  }
}

export default WebRTCService; 