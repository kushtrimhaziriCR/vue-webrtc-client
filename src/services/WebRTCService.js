class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.onCallStateChange = null;
    this.onRemoteStream = null;
    this.onCallEnded = null;
    
    // Enhanced ICE servers configuration with better prioritization
    this.iceServers = [
      // STUN servers for NAT traversal
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun.l.google.com:5349" },
      { urls: "stun:stun1.l.google.com:3478" },
      { urls: "stun:stun1.l.google.com:5349" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:5349" },
      { urls: "stun:stun3.l.google.com:3478" },
      { urls: "stun:stun3.l.google.com:5349" },
      { urls: "stun:stun4.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:5349" },
      {
        urls: "stun:stun.relay.metered.ca:80",
      },
      {
        urls: "turn:66.29.135.127:3478",
        username: "testuser",
        credential: "testpassword",
      },
      
           {
        urls: "turn:relay1.expressturn.com:3480",
        username: "000000002069315588",
        credential: "qZqyvpRA+tLuhdux2UlT2jWEaKg=",
      },
      {
        urls: "turn:relay1.expressturn.com:3480?transport=tcp",
        username: "000000002069315588",
        credential: "qZqyvpRA+tLuhdux2UlT2jWEaKg=",
      },
      {
        urls: "turns:relay1.expressturn.com:443",
        username: "000000002069315588",
        credential: "qZqyvpRA+tLuhdux2UlT2jWEaKg=",
      },
      // TURN servers for relay when direct connection fails
      {
        urls: "turn:europe.relay.metered.ca:80",
        username: "1066275211949c2711b59b43",
        credential: "AX9s72vcBk6xPL0W",
      },
      {
        urls: "turn:europe.relay.metered.ca:80?transport=tcp",
        username: "1066275211949c2711b59b43",
        credential: "AX9s72vcBk6xPL0W",
      },
      {
        urls: "turn:europe.relay.metered.ca:443",
        username: "1066275211949c2711b59b43",
        credential: "AX9s72vcBk6xPL0W",
      },
      {
        urls: "turns:europe.relay.metered.ca:443?transport=tcp",
        username: "1066275211949c2711b59b43",
        credential: "AX9s72vcBk6xPL0W",
      },
    ];
    
    // Enhanced RTCConfiguration for better connectivity
    this.rtcConfig = {
      iceServers: this.iceServers,
      iceTransportPolicy: 'all', // Allow all types of candidates
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
      iceCandidatePoolSize: 10,
      // Additional options for better remote connectivity
      sdpSemantics: 'unified-plan'
    };
    
  }

  // Initialize peer connection
  async createPeerConnection(cameraId = null, microphoneId = null) {
    try {
      this.peerConnection = new RTCPeerConnection(this.rtcConfig);
      
      // Check permissions first
      console.log('🔍 Checking media permissions...')
      try {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' });
        const microphonePermission = await navigator.permissions.query({ name: 'microphone' });
        console.log('Camera permission state:', cameraPermission.state);
        console.log('Microphone permission state:', microphonePermission.state);
      } catch (permError) {
        console.warn('Could not check permissions:', permError);
      }
      
      // Get local audio and video stream with specific devices
      console.log('📹 Requesting camera and microphone access...')
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
        console.warn('Error name:', videoError.name)
        console.warn('Error message:', videoError.message)
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
          console.warn('Basic error name:', basicError.name)
          console.warn('Basic error message:', basicError.message)
          
          // Last resort: audio only
          try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false
            });
            console.log('✅ Media stream obtained (audio only)')
          } catch (audioError) {
            console.error('❌ Failed to get any media stream:', audioError)
            console.error('Audio error name:', audioError.name)
            console.error('Audio error message:', audioError.message)
            
            // Provide specific error messages for common issues
            if (audioError.name === 'NotAllowedError') {
              throw new Error('Camera/microphone permission denied. Please allow access in your browser settings.');
            } else if (audioError.name === 'NotFoundError') {
              throw new Error('No camera or microphone found on this device.');
            } else if (audioError.name === 'NotReadableError') {
              throw new Error('Camera or microphone is being used by another application.');
            } else if (audioError.name === 'OverconstrainedError') {
              throw new Error('Selected camera/microphone is not available. Please try different devices.');
            } else {
              throw new Error(`Failed to access camera/microphone: ${audioError.message}`);
            }
          }
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
      
      // Handle remote stream with enhanced debugging
      this.peerConnection.ontrack = (event) => {
        console.log('🎯 REMOTE TRACK RECEIVED:', {
          kind: event.track.kind,
          enabled: event.track.enabled,
          readyState: event.track.readyState,
          id: event.track.id,
          muted: event.track.muted
        });
        
        console.log('📹 Remote streams available:', event.streams.length);
        event.streams.forEach((stream, index) => {
          console.log(`Stream ${index}:`, {
            id: stream.id,
            active: stream.active,
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length
          });
        });
        
        // Use the first stream or create a new one
        if (event.streams && event.streams.length > 0) {
          this.remoteStream = event.streams[0];
          console.log('✅ Remote stream assigned:', this.remoteStream.id);
        } else {
          // Create a new MediaStream if none provided
          this.remoteStream = new MediaStream();
          this.remoteStream.addTrack(event.track);
          console.log('✅ Created new remote stream with track');
        }
        
        // Enable the track if it's disabled
        if (!event.track.enabled) {
          console.log('🔧 Enabling remote track...');
          event.track.enabled = true;
        }
        
        // Notify about remote stream
        if (this.onRemoteStream) {
          console.log('📞 Calling onRemoteStream callback');
          this.onRemoteStream(this.remoteStream);
        } else {
          console.warn('⚠️ No onRemoteStream callback set');
        }
      };
      
      // Handle ICE candidates with enhanced logging and filtering
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate;
          console.log('🧊 ICE candidate generated:', {
            type: candidate.type,
            protocol: candidate.protocol,
            address: candidate.address,
            port: candidate.port,
            priority: candidate.priority,
            isRelay: candidate.candidate.includes('relay')
          });
          
          // Log TURN candidates more prominently for remote debugging
          if (candidate.candidate.includes('relay')) {
            console.log('🔄 TURN RELAY CANDIDATE:', candidate.candidate);
          }
          
          if (this.onCallStateChange) {
            this.onCallStateChange('ice-candidate', candidate);
          }
        } else {
          console.log('✅ ICE candidate gathering completed');
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
      
      console.log('📞 Handling incoming offer from:', offer.fromUserId)
      console.log('📋 Offer SDP length:', offer.sdp?.length || 0)
      
      // Create RTCSessionDescription with proper type and SDP
      const sessionDescription = new RTCSessionDescription({
        type: 'offer',
        sdp: offer.sdp
      })
      
      await this.peerConnection.setRemoteDescription(sessionDescription);
      console.log('✅ Remote description set successfully')
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('✅ Answer created successfully, SDP length:', answer.sdp?.length || 0)
      
      return {
        type: 'ANSWER',
        fromUserId: null, // Will be set by the callee
        toUserId: offer.fromUserId,
        callId: offer.callId,
        sdp: answer.sdp
      };
    } catch (error) {
      console.error('❌ Failed to handle offer:', error);
      return null;
    }
  }

  // Handle incoming answer
  async handleAnswer(answer) {
    try {
      if (this.peerConnection) {
        console.log('📞 Handling incoming answer, SDP length:', answer.sdp?.length || 0)
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription({
          type: 'answer',
          sdp: answer.sdp
        }));
        console.log('✅ Answer remote description set successfully')
      } else {
        console.warn('⚠️ No peer connection available for answer')
      }
    } catch (error) {
      console.error('❌ Failed to handle answer:', error);
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

  // Configure ICE transport policy for different scenarios
  setIceTransportPolicy(policy = 'all') {
    if (this.rtcConfig) {
      this.rtcConfig.iceTransportPolicy = policy;
    }
  }

  // Force TURN usage for remote connections
  enableRemoteMode() {
    if (this.rtcConfig) {
      this.rtcConfig.iceTransportPolicy = 'relay';
      console.log('🔧 Enabled relay-only mode for remote connections');
    }
  }

  // Enable local mode for testing
  enableLocalMode() {
    if (this.rtcConfig) {
      this.rtcConfig.iceTransportPolicy = 'all';
      console.log('🔧 Enabled all-candidates mode for local testing');
    }
  }

  // Debug network connectivity and ICE candidates
  async debugNetworkConnectivity() {
    if (!this.peerConnection) {
      console.log('No peer connection available for debugging');
      return;
    }

    console.log('=== Network Connectivity Debug ===');
    console.log('Connection state:', this.peerConnection.connectionState);
    console.log('ICE connection state:', this.peerConnection.iceConnectionState);
    console.log('ICE gathering state:', this.peerConnection.iceGatheringState);
    
    // Get local and remote descriptions
    if (this.peerConnection.localDescription) {
      console.log('Local description type:', this.peerConnection.localDescription.type);
    }
    if (this.peerConnection.remoteDescription) {
      console.log('Remote description type:', this.peerConnection.remoteDescription.type);
    }
    
    // Check remote stream status
    if (this.remoteStream) {
      console.log('Remote stream active:', this.remoteStream.active);
      console.log('Remote stream tracks:', this.remoteStream.getTracks().length);
      this.remoteStream.getTracks().forEach((track, index) => {
        console.log(`Track ${index}:`, {
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted
        });
      });
    } else {
      console.log('No remote stream available');
    }
    
    // Check if using TURN servers
    const stats = await this.peerConnection.getStats();
    let turnUsage = false;
    stats.forEach(report => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        if (report.localCandidateId && report.remoteCandidateId) {
          const localCandidate = stats.get(report.localCandidateId);
          const remoteCandidate = stats.get(report.remoteCandidateId);
          if (localCandidate && remoteCandidate) {
            if (localCandidate.candidateType === 'relay' || remoteCandidate.candidateType === 'relay') {
              turnUsage = true;
              console.log('🔄 TURN server is being used for connection');
            }
          }
        }
      }
    });
    
    if (!turnUsage) {
      console.log('⚠️ No TURN server usage detected - this may cause remote connection issues');
    }
    
    console.log('=== End Debug ===');
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