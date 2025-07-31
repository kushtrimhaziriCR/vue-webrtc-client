<template>
  <div id="app">
    <div class="container">
      <div class="header">
        <h1>WebRTC Client</h1>
        <p>Connect to the signaling server and manage user sessions</p>
        <div class="feature-info" v-if="isLoggedIn">
          <small>
            <strong>MobileApp users:</strong> Can only broadcast calls to WebApp users<br>
            <strong>WebApp users:</strong> Can make direct calls to MobileApp users only
          </small>
        </div>
      </div>
      
      <div class="content">
        <!-- Connection Status -->
        <div :class="['status', connectionStatus]">
          <span v-if="connectionStatus === 'connected'">
            ✅ Connected to WebSocket server
          </span>
          <span v-else-if="connectionStatus === 'connecting'">
            🔄 Connecting to WebSocket server...
          </span>
          <span v-else>
            ❌ Disconnected from WebSocket server
          </span>
        </div>

        <!-- Connection Info -->
        <div class="connection-info" v-if="connectionStatus === 'connected'">
          <strong>Server:</strong> {{ wsUrl }}<br>
          <strong>User ID:</strong> {{ currentUserId || 'Not set' }}<br>
          <strong>Online Users:</strong> {{ onlineUsersCount }}<br>
          <strong>Call Status:</strong> 
          <span v-if="isInCall" class="call-status-badge">In Call</span>
          <span v-else class="call-status-badge available">Available</span>
        </div>

        <!-- Call Status for Both Caller and Callee -->
        <div v-if="isInCall && callingUserId" class="call-status-info">
          <strong v-if="callingUserId === 'BROADCAST' && callState !== 'connected'">Broadcasting to:</strong>
          <strong v-else-if="callingUserId === 'BROADCAST' && callState === 'connected'">Connected to:</strong>
          <strong v-else>Calling:</strong> 
          <span v-if="callingUserId === 'BROADCAST' && callState !== 'connected'">All WebApp Users</span>
          <span v-else-if="callingUserId === 'BROADCAST' && callState === 'connected'">{{ connectedUserId || 'Unknown User' }}</span>
          <span v-else>{{ callingUserId }}</span><br>
          <strong>Call Type:</strong> 
          <span v-if="callingUserId === 'BROADCAST' || currentUserType === 'MobileApp'" class="status-badge broadcast">Broadcast Call</span>
          <span v-else class="status-badge direct">Direct Call</span><br>
          <strong>Status:</strong> 
          <span v-if="callState === 'incoming'" class="status-badge incoming">Incoming Call</span>
          <span v-else-if="callState === 'connecting'" class="status-badge connecting">Connecting...</span>
          <span v-else-if="callState === 'connected'" class="status-badge connected">Connected</span>
          <span v-else class="status-badge connecting">Initializing...</span>
          
          <!-- Video Streams -->
          <div class="video-container" v-if="isInCall">
            <div class="video-wrapper">
              <h4>Local Video</h4>
              <video 
                ref="localVideo" 
                autoplay 
                muted 
                playsinline
                class="video-stream local-video"
              ></video>
            </div>
            <div class="video-wrapper" v-if="callState === 'connected'">
              <h4>Remote Video</h4>
              <video 
                ref="remoteVideo" 
                autoplay 
                playsinline
                class="video-stream remote-video"
              ></video>
            </div>
          </div>
          
          <div style="margin-top: 10px;">
            <button v-if="callState === 'incoming'" class="btn btn-accept" @click="acceptIncomingCall">
              Accept Call
            </button>
            <button v-if="callState === 'incoming'" class="btn btn-reject" @click="rejectIncomingCall">
              Reject Call
            </button>
            <button v-if="callState !== 'incoming'" class="btn btn-secondary" @click="endCurrentCall">
              End Call
            </button>
          </div>
        </div>

        <!-- User Login Form -->
        <div v-if="!isLoggedIn">
          <div class="form-group">
            <label for="userId">User ID:</label>
            <input 
              id="userId"
              v-model="userIdInput" 
              type="text" 
              placeholder="Enter your user ID"
              @keyup.enter="goOnline"
            />
          </div>
          
          <div class="form-group">
            <label for="metadata">Metadata (optional):</label>
            <input 
              id="metadata"
              v-model="metadataInput" 
              type="text" 
              placeholder="Enter metadata (e.g., display name, role)"
            />
          </div>
          
          <div class="form-group">
            <label>User Type:</label>
            <div class="radio-group">
              <label class="radio-label">
                <input 
                  type="radio" 
                  v-model="userTypeInput" 
                  value="WebApp"
                />
                Web App
              </label>
              <label class="radio-label">
                <input 
                  type="radio" 
                  v-model="userTypeInput" 
                  value="MobileApp"
                />
                Mobile App
              </label>
            </div>
          </div>
          
          <button 
            class="btn" 
            @click="goOnline"
            :disabled="!userIdInput.trim() || connectionStatus !== 'connected'"
          >
            Go Online
          </button>
        </div>

        <!-- User Controls -->
        <div v-else>
          <div class="connection-info">
            <strong>Logged in as:</strong> {{ currentUserId }}<br>
            <strong>User Type:</strong> {{ currentUserType }}<br>
            <strong>Metadata:</strong> {{ currentMetadata || 'None' }}
          </div>
          
          <div class="button-group">
            <button class="btn btn-secondary" @click="goOffline">
              Go Offline
            </button>
            
            <button class="btn btn-debug" @click="debugCameras">
              🔍 Debug Cameras
            </button>
            
            <button class="btn btn-devices" @click="openDeviceSelector">
              ⚙️ Select Devices
            </button>
            
            <button class="btn btn-test" @click="testVideoElements">
              📺 Test Video
            </button>
          </div>
        </div>

        <!-- Online Users Section -->
        <div class="users-section" v-if="isLoggedIn">
          <h3>{{ getUsersSectionTitle() }}</h3>
          
          <!-- MobileApp User Interface -->
          <div v-if="currentUserType === 'MobileApp'">
            <div v-if="availableWebAppUsers.length === 0" class="empty-state">
              <p>No WebApp users available for broadcast</p>
              <p>WebApp users need to be online to receive your broadcast calls</p>
            </div>
            
            <div v-else class="broadcast-section">
              <div class="broadcast-info">
                <p><strong>Available WebApp Users:</strong> {{ availableWebAppUsers.length }}</p>
                <p>Click "Broadcast Call" to send a call to all available WebApp users</p>
              </div>
              
              <button 
                class="btn btn-broadcast"
                @click="initiateBroadcastCall()"
                :disabled="isInCall"
                :title="isInCall ? 'You are in a call' : 'Broadcast call to all WebApp users'"
              >
                📡 Broadcast Call
              </button>
              
              <div class="users-list">
                <div 
                  v-for="user in availableWebAppUsers" 
                  :key="user.userId"
                  class="user-card"
                >
                  <h4>
                    <span class="online-indicator"></span>
                    {{ user.userId }}
                  </h4>
                  <p v-if="user.metadata">
                    <strong>Info:</strong> {{ user.metadata }}
                  </p>
                  <p>
                    <strong>Status:</strong> 
                    <span v-if="user.inCall" class="status-badge busy">In Call</span>
                    <span v-else class="status-badge available">Available</span>
                  </p>
                  <p v-if="user.lastSeen">
                    <strong>Last Seen:</strong> {{ formatTimestamp(user.lastSeen) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- WebApp User Interface -->
          <div v-else-if="currentUserType === 'WebApp'">
            <div v-if="availableMobileAppUsers.length === 0" class="empty-state">
              <p>No MobileApp users online</p>
              <p>MobileApp users need to be online for you to call them</p>
            </div>
            
            <div v-else class="users-list">
              <div 
                v-for="user in availableMobileAppUsers" 
                :key="user.userId"
                class="user-card"
              >
                <h4>
                  <span class="online-indicator"></span>
                  {{ user.userId }}
                </h4>
                <p v-if="user.metadata">
                  <strong>Info:</strong> {{ user.metadata }}
                </p>
                <p>
                  <strong>Status:</strong> 
                  <span v-if="user.inCall" class="status-badge busy">In Call</span>
                  <span v-else class="status-badge available">Available</span>
                </p>
                <p v-if="user.lastSeen">
                  <strong>Last Seen:</strong> {{ formatTimestamp(user.lastSeen) }}
                </p>
                
                <!-- Call Button for WebApp users -->
                <button 
                  class="btn btn-call"
                  @click="initiateCall(user.userId)"
                  :disabled="isInCall || user.isInCall"
                  :title="isInCall ? 'You are in a call' : user.isInCall ? 'User is busy' : 'Call user'"
                >
                  📞 Call
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Device Selector -->
    <DeviceSelector
      :show="showDeviceSelector"
      @devices-selected="handleDevicesSelected"
      @close="closeDeviceSelector"
    />
  </div>
</template>

<script>
import WebRTCService from './services/WebRTCService.js'
import DeviceSelector from './components/DeviceSelector.vue'

export default {
  name: 'App',
  components: {
    DeviceSelector
  },
  data() {
    return {
      wsUrl: 'wss://gateway.dev.api.conroo.com/ws/v1/webrtc/signaling',
      ws: null,
      connectionStatus: 'disconnected', // 'disconnected', 'connecting', 'connected'
      
      // User management
      userIdInput: '',
      metadataInput: '',
      userTypeInput: 'WebApp',
      currentUserId: null,
      currentMetadata: null,
      currentUserType: null,
      isLoggedIn: false,
      
      // Online users
      onlineUsers: [],
      onlineUsersCount: 0,
      
      // Reconnection
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
      reconnectInterval: null,
      
      // WebRTC
      webRTCService: null,
      isInCall: false,
      callState: 'incoming', // 'incoming', 'connecting', 'connected', 'ended'
      callingUserId: null,
      connectedUserId: null, // Track the actual user we're connected to (for broadcast calls)
      currentCallId: null,
      incomingCall: {
        callerId: '',
        callerMetadata: '',
        callId: '',
        sdp: ''
      },
      devices: [],
      showDeviceSelector: false,
      selectedDevices: {
        cameraId: null,
        microphoneId: null
      },
      pendingCallTarget: null
    }
  },
  
  computed: {
    // Filter users based on current user type
    availableWebAppUsers() {
      return this.onlineUsers.filter(user => user.userType === 'WebApp' && !user.inCall)
    },
    
    availableMobileAppUsers() {
      return this.onlineUsers.filter(user => user.userType === 'MobileApp' && !user.inCall)
    }
  },
  
  mounted() {
    // Initialize WebRTC service
    this.webRTCService = new WebRTCService()
    this.webRTCService.setCallbacks(
      this.handleCallStateChange,
      this.handleRemoteStream,
      this.handleCallEnded
    )
    
    // Auto-connect on mount
    this.connectWebSocket()
  },
  
  beforeUnmount() {
    this.cleanup()
  },
  
  methods: {
    connectWebSocket() {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        return
      }
      
      this.connectionStatus = 'connecting'
      
      try {
        this.ws = new WebSocket(this.wsUrl)
        
        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.connectionStatus = 'connected'
          this.reconnectAttempts = 0
          
          // If we were logged in before, reconnect
          if (this.currentUserId) {
            this.sendUserOnline()
          }
        }
        
        this.ws.onmessage = (event) => {
          this.handleWebSocketMessage(event.data)
        }
        
        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason)
          this.connectionStatus = 'disconnected'
          this.isLoggedIn = false
          
          // Only end call if it's an unexpected disconnect (not user-initiated)
          if (event.code !== 1000) {
            console.log('Unexpected WebSocket disconnect, ending call')
            this.endCurrentCall()
          }
          
          // Attempt reconnection if not manually disconnected
          if (event.code !== 1000) {
            this.attemptReconnect()
          }
        }
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.connectionStatus = 'disconnected'
        }
        
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error)
        this.connectionStatus = 'disconnected'
      }
    },
    
    disconnectWebSocket() {
      if (this.ws) {
        this.ws.close(1000, 'User disconnected')
      }
      this.cleanup()
    },
    
    attemptReconnect() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('Max reconnection attempts reached')
        return
      }
      
      this.reconnectAttempts++
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000)
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`)
      
      this.reconnectInterval = setTimeout(() => {
        this.connectWebSocket()
      }, delay)
    },
    
    cleanup() {
      if (this.reconnectInterval) {
        clearTimeout(this.reconnectInterval)
        this.reconnectInterval = null
      }
      this.endCurrentCall()
    },
    
    goOnline() {
      if (!this.userIdInput.trim()) {
        alert('Please enter a user ID')
        return
      }
      
      this.currentUserId = this.userIdInput.trim()
      this.currentMetadata = this.metadataInput.trim() || null
      this.currentUserType = this.userTypeInput
      this.isLoggedIn = true
      
      this.sendUserOnline()
    },
    
    goOffline() {
      if (this.currentUserId) {
        this.sendUserOffline()
      }
      
      this.endCurrentCall()
      this.currentUserId = null
      this.currentMetadata = null
      this.currentUserType = null
      this.isLoggedIn = false
      this.onlineUsers = []
      this.onlineUsersCount = 0
    },
    
    sendUserOnline() {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.error('WebSocket not connected')
        return
      }
      
      const message = {
        type: 'USER_ONLINE',
        fromUserId: this.currentUserId,
        metadata: this.currentMetadata,
        facilityId: '8',
        userType: this.currentUserType
      }
      
      this.ws.send(JSON.stringify(message))
      console.log('Sent USER_ONLINE:', message)
    },
    
    sendUserOffline() {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return
      }
      
      const message = {
        type: 'USER_OFFLINE',
        fromUserId: this.currentUserId,
        metadata: this.currentMetadata
      }
      
      this.ws.send(JSON.stringify(message))
      console.log('Sent USER_OFFLINE:', message)
    },
    
    handleWebSocketMessage(data) {
      try {
        const message = JSON.parse(data)
        console.log('Received WebSocket message:', message)
        
        switch (message.type) {
          case 'USER_ONLINE':
            if (message.status === 'confirmed') {
              this.onlineUsersCount = message.onlineUsersCount || 0
              console.log('User online confirmed, total users:', this.onlineUsersCount)
            }
            break
            
          case 'USER_OFFLINE':
            if (message.status === 'confirmed') {
              this.onlineUsersCount = message.onlineUsersCount || 0
              console.log('User offline confirmed, total users:', this.onlineUsersCount)
            }
            break
            
          case 'USER_LIST_UPDATE':
            // Handle user list updates if your server sends them
            if (message.users) {
              this.onlineUsers = message.users.filter(user => user.userId !== this.currentUserId)
            }
            break
            
          case 'OFFER':
            console.log('Received OFFER:', message)
            this.handleIncomingOffer(message)
            break
            
          case 'ANSWER':
            console.log('Received ANSWER:', message)
            this.handleIncomingAnswer(message)
            break
            
          case 'ICE_CANDIDATE':
            console.log('Received ICE_CANDIDATE:', message)
            this.handleIncomingIceCandidate(message)
            break
            
          case 'CALL_REJECT':
            console.log('Received CALL_REJECT:', message)
            this.handleCallRejected(message)
            break
            
          case 'CALL_END':
            console.log('Received CALL_END:', message)
            this.handleCallEnded(message)
            break
            
          case 'CALL_CANCEL':
            console.log('Received CALL_CANCEL:', message)
            this.handleCallCanceled(message)
            break
            
          default:
            console.log('Unknown message type:', message.type)
        }
        
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
        console.error('Raw message data:', data)
        console.error('Message length:', data.length)
      }
    },
    
    // WebRTC Methods
    async initiateCall(toUserId) {
      if (this.isInCall) {
        alert('You are already in a call')
        return
      }
      
      // Show device selector if devices haven't been selected
      if (!this.selectedDevices.cameraId || !this.selectedDevices.microphoneId) {
        this.showDeviceSelector = true
        // Store the target user ID to call after device selection
        this.pendingCallTarget = toUserId
        return
      }
      
      console.log('Initiating call to:', toUserId)
      
      try {
        const offer = await this.webRTCService.createOffer(toUserId, this.selectedDevices.cameraId, this.selectedDevices.microphoneId)
        if (!offer) {
          console.error('Failed to create offer')
          alert('Failed to create call offer')
          return
        }
        
        console.log('Offer created successfully:', offer)
        
        offer.fromUserId = this.currentUserId
        this.currentCallId = offer.callId
        this.callingUserId = toUserId
        
        // Determine message type based on user type
        const messageType = this.currentUserType === 'MobileApp' ? 'BROADCAST_OFFER' : 'OFFER'
        offer.type = messageType
        
        console.log(`Sending ${messageType} via WebSocket:`, offer)
        
        // Check if WebSocket is open before sending
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          console.error('WebSocket not open, cannot send offer')
          alert('Connection lost. Please reconnect and try again.')
          return
        }
        
        this.ws.send(JSON.stringify(offer))
        
        // Show calling state for the CALLER (not the modal)
        this.callState = 'connecting'
        this.isInCall = true
        
        // Set local video stream with automatic refresh
        this.setupLocalVideoWithAutoRefresh()
        
        console.log('Call initiated successfully')
        
      } catch (error) {
        console.error('Failed to initiate call:', error)
        alert('Failed to initiate call: ' + error.message)
      }
    },
    
    handleIncomingOffer(offer) {
      console.log('Handling incoming offer from:', offer.fromUserId)
      
      // Only show modal if we're NOT the caller (i.e., we're the callee)
      if (offer.fromUserId === this.currentUserId) {
        console.log('Received our own offer, ignoring')
        return
      }
      
      if (this.isInCall) {
        console.log('User is already in call, rejecting')
        // Reject call if already in call
        const rejectMessage = {
          type: 'CALL_REJECT',
          fromUserId: this.currentUserId,
          toUserId: offer.fromUserId,
          callId: offer.callId,
          reason: 'User is busy'
        }
        this.ws.send(JSON.stringify(rejectMessage))
        return
      }
      
      // Set up incoming call data
      this.incomingCall = {
        callerId: offer.fromUserId,
        callerMetadata: this.getUserMetadata(offer.fromUserId),
        callId: offer.callId,
        sdp: offer.sdp
      }
      
      this.currentCallId = offer.callId
      this.callingUserId = offer.fromUserId
      this.callState = 'incoming'
      
      // Show the same interface as caller (no modal)
      this.isInCall = true
      
      console.log('Incoming call interface shown for:', this.callingUserId)
    },
    
    async acceptIncomingCall() {
      try {
        console.log('Accepting incoming call from:', this.callingUserId)
        
        if (!this.incomingCall.sdp) {
          console.error('No SDP received in incoming call')
          alert('Invalid call offer - no SDP received')
          return
        }
        
        const answer = await this.webRTCService.handleOffer({
          fromUserId: this.callingUserId,
          callId: this.currentCallId,
          sdp: this.incomingCall.sdp
        }, this.selectedDevices.cameraId, this.selectedDevices.microphoneId)
        
        if (!answer) {
          console.error('Failed to create answer')
          alert('Failed to accept call')
          return
        }
        
        console.log('Answer created successfully')
        
        answer.fromUserId = this.currentUserId
        
        // Check if WebSocket is open before sending
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          console.error('WebSocket not open, cannot send answer')
          alert('Connection lost. Please reconnect and try again.')
          return
        }
        
        console.log('Sending ANSWER via WebSocket')
        this.ws.send(JSON.stringify(answer))
        
        this.callState = 'connecting'
        this.isInCall = true
        
        // Set local video stream with automatic refresh
        this.setupLocalVideoWithAutoRefresh()
        
        console.log('Call accepted successfully')
        
      } catch (error) {
        console.error('Failed to accept call:', error)
        alert('Failed to accept call: ' + error.message)
      }
    },
    
    rejectIncomingCall() {
      const rejectMessage = {
        type: 'CALL_REJECT',
        fromUserId: this.currentUserId,
        toUserId: this.callingUserId,
        callId: this.currentCallId,
        reason: 'Call rejected'
      }
      
      this.ws.send(JSON.stringify(rejectMessage))
      
      // Reset call state
      this.isInCall = false
      this.currentCallId = null
      this.callingUserId = null
      this.connectedUserId = null
      this.callState = 'ended'
      this.incomingCall = {
        callerId: '',
        callerMetadata: '',
        callId: '',
        sdp: ''
      }
    },
    
    async handleIncomingAnswer(answer) {
      try {
        await this.webRTCService.handleAnswer(answer)
        this.callState = 'connected'
        this.isInCall = true
        
        // For broadcast calls, track the actual user who answered
        if (this.callingUserId === 'BROADCAST') {
          this.connectedUserId = answer.fromUserId
          console.log('Broadcast call answered by:', this.connectedUserId)
        }
      } catch (error) {
        console.error('Failed to handle answer:', error)
      }
    },
    
    async handleIncomingIceCandidate(message) {
      try {
        console.log('Processing incoming ICE candidate:', message.iceCandidate)
        
        // Convert string back to RTCIceCandidate object
        const iceCandidate = new RTCIceCandidate({
          candidate: message.iceCandidate,
          sdpMid: '0', // Default values since server only sends candidate string
          sdpMLineIndex: 0
        })
        
        await this.webRTCService.handleIceCandidate(iceCandidate)
        console.log('ICE candidate processed successfully')
      } catch (error) {
        console.error('Failed to handle ICE candidate:', error)
      }
    },
    
    handleCallRejected(message) {
      alert(`Call was rejected: ${message.reason || 'Unknown reason'}`)
    },
    
    handleCallCanceled(message) {
      console.log('Call was canceled:', message)
      
      // If we're currently in an incoming call state and this is the same call
      if (this.isInCall && this.callState === 'incoming' && this.currentCallId === message.callId) {
        alert(`Call was answered by another user: ${message.reason || 'Call answered by another user'}`)
        
        // Reset call state
        this.isInCall = false
        this.currentCallId = null
        this.callingUserId = null
        this.connectedUserId = null
        this.callState = 'ended'
        this.incomingCall = {
          callerId: '',
          callerMetadata: '',
          callId: '',
          sdp: ''
        }
      } else {
        // Just show a notification for other cases
        console.log('Call cancel notification:', message.reason || 'Call answered by another user')
      }
    },
    
    endCurrentCall() {
      console.log('endCurrentCall called, currentCallId:', this.currentCallId, 'callingUserId:', this.callingUserId, 'connectedUserId:', this.connectedUserId)
      
      if (this.currentCallId && this.callingUserId) {
        // For broadcast calls, use the actual connected user ID instead of 'BROADCAST'
        const targetUserId = (this.callingUserId === 'BROADCAST' && this.connectedUserId) ? this.connectedUserId : this.callingUserId
        
        const endMessage = {
          type: 'CALL_END',
          fromUserId: this.currentUserId,
          toUserId: targetUserId,
          callId: this.currentCallId
        }
        console.log('Sending CALL_END message:', endMessage)
        
        // Check if WebSocket is open before sending
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(endMessage))
        } else {
          console.warn('WebSocket not open, cannot send CALL_END message')
        }
      }
      
      this.webRTCService.endCall()
      this.isInCall = false
      this.currentCallId = null
      this.callingUserId = null
      this.connectedUserId = null
      this.callState = 'ended'
      this.incomingCall = {
        callerId: '',
        callerMetadata: '',
        callId: '',
        sdp: ''
      }
    },
    
    // WebRTC Service Callbacks
    handleCallStateChange(type, data) {
      console.log('WebRTC state change:', type, data)
      
      if (type === 'ice-candidate') {
        // Check if WebSocket is open before sending
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          console.warn('WebSocket not open, cannot send ICE candidate')
          return
        }
        
        // Convert RTCIceCandidate to string format that the server expects
        const iceCandidateString = data.candidate
        
        const message = {
          type: 'ICE_CANDIDATE',
          fromUserId: this.currentUserId,
          toUserId: this.callingUserId,
          callId: this.currentCallId,
          iceCandidate: iceCandidateString
        }
        console.log('Sending ICE candidate:', message)
        this.ws.send(JSON.stringify(message))
      } else if (type === 'connection-state') {
        console.log('Connection state changed to:', data)
        if (data === 'connected') {
          this.callState = 'connected'
        }
      }
    },
    
    handleRemoteStream(stream) {
      console.log('Remote stream received:', stream)
      console.log('Remote video tracks:', stream.getVideoTracks())
      console.log('Remote audio tracks:', stream.getAudioTracks())
      
      // Set the remote video stream with automatic refresh
      this.setupRemoteVideoWithAutoRefresh(stream)
      
      // Also ensure the call state is updated to connected
      if (this.callState !== 'connected') {
        console.log('Updating call state to connected due to remote stream')
        this.callState = 'connected'
      }
    },
    
    handleCallEnded() {
      console.log('WebRTC service called handleCallEnded')
      this.isInCall = false
      this.currentCallId = null
      this.callingUserId = null
      this.connectedUserId = null
      this.callState = 'ended'
      this.incomingCall = {
        callerId: '',
        callerMetadata: '',
        callId: '',
        sdp: ''
      }
    },
    
    // Helper methods
    getUserMetadata(userId) {
      const user = this.onlineUsers.find(u => u.userId === userId)
      return user ? user.metadata : ''
    },
    
    getCallButtonText(user) {
      if (this.isInCall) return '📞 In Call'
      if (user.isInCall) return '📞 Busy'
      if (this.currentUserType === 'MobileApp' && user.userType !== 'WebApp') {
        return '📞 Broadcast Only'
      }
      return '📞 Call'
    },
    
    getCallButtonTitle(user) {
      if (this.isInCall) return 'You are in a call'
      if (user.isInCall) return 'User is busy'
      if (this.currentUserType === 'MobileApp' && user.userType !== 'WebApp') {
        return 'MobileApp users can only broadcast to WebApp users'
      }
      return 'Call user'
    },
    
    getUsersSectionTitle() {
      if (this.currentUserType === 'MobileApp') {
        return `Available WebApp Users (${this.availableWebAppUsers.length})`
      } else {
        return `Available MobileApp Users (${this.availableMobileAppUsers.length})`
      }
    },
    
    async initiateBroadcastCall() {
      if (this.isInCall) {
        alert('You are already in a call')
        return
      }
      
      if (this.availableWebAppUsers.length === 0) {
        alert('No WebApp users available for broadcast')
        return
      }
      
      // Show device selector if devices haven't been selected
      if (!this.selectedDevices.cameraId || !this.selectedDevices.microphoneId) {
        this.showDeviceSelector = true
        // Store the broadcast flag to call after device selection
        this.pendingCallTarget = 'BROADCAST'
        return
      }
      
      console.log('Initiating broadcast call to all WebApp users')
      
      try {
        // Create a broadcast call (we'll use a special target)
        const offer = await this.webRTCService.createOffer('BROADCAST', this.selectedDevices.cameraId, this.selectedDevices.microphoneId)
        if (!offer) {
          console.error('Failed to create broadcast offer')
          alert('Failed to create broadcast offer')
          return
        }
        
        console.log('Broadcast offer created successfully:', offer)
        
        offer.fromUserId = this.currentUserId
        offer.type = 'BROADCAST_OFFER'
        this.currentCallId = offer.callId
        this.callingUserId = 'BROADCAST'
        
        console.log('Sending BROADCAST_OFFER via WebSocket:', offer)
        
        // Check if WebSocket is open before sending
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          console.error('WebSocket not open, cannot send broadcast offer')
          alert('Connection lost. Please reconnect and try again.')
          return
        }
        
        this.ws.send(JSON.stringify(offer))
        
        // Show calling state for the broadcaster
        this.callState = 'connecting'
        this.isInCall = true
        
        // Set local video stream with automatic refresh
        this.setupLocalVideoWithAutoRefresh()
        
        console.log('Broadcast call initiated successfully')
        
      } catch (error) {
        console.error('Failed to initiate broadcast call:', error)
        alert('Failed to initiate broadcast call: ' + error.message)
      }
    },
    
    formatTimestamp(timestamp) {
      if (!timestamp) return 'Unknown'
      
      const date = new Date(timestamp)
      return date.toLocaleString()
    },
    
    // Poll for online users (fallback if WebSocket doesn't send user list updates)
    async fetchOnlineUsers() {
      try {
        const response = await fetch('https://gateway.dev.api.conroo.com/api/v1/webrtc/users/online')
        const data = await response.json()
        
        if (data.users) {
          this.onlineUsers = data.users.filter(user => user.userId !== this.currentUserId)
          this.onlineUsersCount = data.totalCount || 0
        }
      } catch (error) {
        console.error('Failed to fetch online users:', error)
      }
    },
    
    debugCameras() {
      console.log('=== Camera Debug Information ===')
      
      // List available cameras
      this.webRTCService.listCameras().then(cameras => {
        console.log('Found cameras:', cameras.length)
        cameras.forEach((camera, index) => {
          console.log(`Camera ${index + 1}:`, camera.label || `Camera ${index + 1}`, camera.deviceId)
        })
      })
      
      // Test with selected devices
      if (this.selectedDevices.cameraId || this.selectedDevices.microphoneId) {
        console.log('Testing with selected devices...')
        this.webRTCService.testMediaStream(
          this.selectedDevices.cameraId, 
          this.selectedDevices.microphoneId
        ).then(success => {
          if (success) {
            console.log('✅ Selected devices work correctly')
          } else {
            console.log('❌ Selected devices failed')
          }
        })
      }
      
      // Test with basic constraints
      console.log('Testing with basic constraints...')
      this.webRTCService.testMediaStream().then(success => {
        if (success) {
          console.log('✅ Basic constraints work correctly')
        } else {
          console.log('❌ Basic constraints failed')
        }
      })
      
      // Check permissions
      navigator.permissions.query({ name: 'camera' })
        .then(permissionStatus => {
          console.log('Camera permission status:', permissionStatus.state)
        })
        .catch(error => {
          console.log('Could not check camera permission:', error)
        })
        
      navigator.permissions.query({ name: 'microphone' })
        .then(permissionStatus => {
          console.log('Microphone permission status:', permissionStatus.state)
        })
        .catch(error => {
          console.log('Could not check microphone permission:', error)
        })
    },
    
    handleDevicesSelected(devices) {
      console.log('Devices selected:', devices)
      this.selectedDevices = devices
      this.showDeviceSelector = false
      
      // If there was a pending call, initiate it now
      if (this.pendingCallTarget) {
        const targetUser = this.pendingCallTarget
        this.pendingCallTarget = null
        
        if (targetUser === 'BROADCAST') {
          this.initiateBroadcastCall()
        } else {
          this.initiateCall(targetUser)
        }
      }
    },
    
    closeDeviceSelector() {
      this.showDeviceSelector = false
    },
    
    openDeviceSelector() {
      this.showDeviceSelector = true
    },
    
    // Test video elements
    testVideoElements() {
      console.log('=== Testing Video Elements ===')
      
      if (this.$refs.localVideo) {
        console.log('Local video element found')
        console.log('Local video srcObject:', this.$refs.localVideo.srcObject)
        console.log('Local video readyState:', this.$refs.localVideo.readyState)
        console.log('Local video videoWidth:', this.$refs.localVideo.videoWidth)
        console.log('Local video videoHeight:', this.$refs.localVideo.videoHeight)
        
        // Check if there's a stream
        const localStream = this.webRTCService.getLocalStream()
        if (localStream) {
          console.log('Local stream available')
          console.log('Local stream active:', localStream.active)
          console.log('Local stream tracks:', localStream.getTracks().map(t => ({
            kind: t.kind,
            enabled: t.enabled,
            readyState: t.readyState
          })))
          
          // Test with a temporary video element
          this.testStreamInVideo(localStream, 'Local Stream')
        } else {
          console.log('No local stream available')
        }
      } else {
        console.log('Local video element not found')
      }
      
      if (this.$refs.remoteVideo) {
        console.log('Remote video element found')
        console.log('Remote video srcObject:', this.$refs.remoteVideo.srcObject)
        console.log('Remote video readyState:', this.$refs.remoteVideo.readyState)
        
        const remoteStream = this.webRTCService.getRemoteStream()
        if (remoteStream) {
          console.log('Remote stream available')
          console.log('Remote stream active:', remoteStream.active)
          
          // Test with a temporary video element
          this.testStreamInVideo(remoteStream, 'Remote Stream')
        } else {
          console.log('No remote stream available')
        }
      } else {
        console.log('Remote video element not found')
      }
    },
    
    // Test stream in a temporary video element
    testStreamInVideo(stream, streamName) {
      console.log(`🧪 Testing ${streamName} in temporary video element`)
      
      // Create a temporary video element
      const tempVideo = document.createElement('video')
      tempVideo.autoplay = true
      tempVideo.muted = true
      tempVideo.playsInline = true
      tempVideo.style.width = '200px'
      tempVideo.style.height = '150px'
      tempVideo.style.border = '2px solid red'
      tempVideo.style.position = 'fixed'
      tempVideo.style.top = '10px'
      tempVideo.style.right = '10px'
      tempVideo.style.zIndex = '9999'
      
      // Set the stream
      tempVideo.srcObject = stream
      
      // Add event listeners
      tempVideo.onloadedmetadata = () => {
        console.log(`✅ ${streamName} metadata loaded in temp video`)
      }
      
      tempVideo.oncanplay = () => {
        console.log(`✅ ${streamName} can play in temp video`)
        console.log(`Temp video dimensions: ${tempVideo.videoWidth}x${tempVideo.videoHeight}`)
      }
      
      tempVideo.onerror = (error) => {
        console.error(`❌ ${streamName} error in temp video:`, error)
      }
      
      // Add to page
      document.body.appendChild(tempVideo)
      
      // Remove after 5 seconds
      setTimeout(() => {
        if (tempVideo.parentNode) {
          tempVideo.parentNode.removeChild(tempVideo)
        }
        console.log(`🧪 Removed temporary video for ${streamName}`)
      }, 5000)
    },
    
    // Force refresh video elements
    forceRefreshVideoElements() {
      console.log('🔄 Force refreshing video elements...')
      
      const localStream = this.webRTCService.getLocalStream()
      const remoteStream = this.webRTCService.getRemoteStream()
      
      // Refresh local video
      if (this.$refs.localVideo && localStream) {
        console.log('Refreshing local video element')
        this.$refs.localVideo.srcObject = null
        setTimeout(() => {
          this.$refs.localVideo.srcObject = localStream
          this.$refs.localVideo.play().catch(e => console.log('Local video play error:', e))
        }, 100)
      } else {
        console.log('Local video element or stream not available for refresh')
      }
      
      // Refresh remote video
      if (this.$refs.remoteVideo && remoteStream) {
        console.log('Refreshing remote video element')
        this.$refs.remoteVideo.srcObject = null
        setTimeout(() => {
          this.$refs.remoteVideo.srcObject = remoteStream
          this.$refs.remoteVideo.play().catch(e => console.log('Remote video play error:', e))
        }, 100)
      } else {
        console.log('Remote video element or stream not available for refresh')
      }
      
      // Log stream information for debugging
      if (localStream) {
        console.log('Local stream info:', {
          active: localStream.active,
          tracks: localStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState }))
        })
      }
      
      if (remoteStream) {
        console.log('Remote stream info:', {
          active: remoteStream.active,
          tracks: remoteStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState }))
        })
      }
    },
    
    // Force refresh remote video when call connects
    forceRefreshRemoteVideo() {
      console.log('🔄 Force refreshing remote video...')
      if (this.$refs.remoteVideo) {
        const remoteStream = this.webRTCService.getRemoteStream()
        if (remoteStream) {
          console.log('Found remote stream, refreshing video element')
          // Temporarily clear and re-set the stream
          this.$refs.remoteVideo.srcObject = null
          setTimeout(() => {
            this.$refs.remoteVideo.srcObject = remoteStream
            this.$refs.remoteVideo.muted = false
            this.$refs.remoteVideo.play().catch(e => {
              console.log('Remote video play error after refresh:', e)
            })
          }, 100)
        } else {
          console.log('No remote stream available for refresh')
        }
      } else {
        console.log('Remote video element not found for refresh')
      }
    },
    
    // New method to set up local video with automatic refresh
    setupLocalVideoWithAutoRefresh() {
      this.$nextTick(() => {
        if (this.$refs.localVideo) {
          const localStream = this.webRTCService.getLocalStream()
          if (localStream) {
            console.log('Setting local video stream with auto refresh')
            this.$refs.localVideo.srcObject = localStream
            
            // Force play the video
            this.$refs.localVideo.play().catch(e => {
              console.log('Local video play error:', e)
            })
            
            // Add event listeners to debug video loading
            this.$refs.localVideo.onloadedmetadata = () => {
              console.log('Local video metadata loaded with auto refresh')
            }
            this.$refs.localVideo.oncanplay = () => {
              console.log('Local video can play with auto refresh')
              // Force play again when ready
              this.$refs.localVideo.play().catch(e => console.log('Local video play error:', e))
            }
            this.$refs.localVideo.onerror = (error) => {
              console.error('Local video error with auto refresh:', error)
            }
          } else {
            console.error('No local stream available for auto refresh')
          }
        } else {
          console.error('Local video element not found for auto refresh')
        }
      })
    },
    
    // New method to set up remote video with automatic refresh
    setupRemoteVideoWithAutoRefresh(stream) {
      if (this.$refs.remoteVideo) {
        console.log('Setting remote video stream with auto refresh')
        console.log('Remote stream tracks:', stream.getTracks())
        console.log('Remote stream active:', stream.active)
        
        // Ensure the video element is not muted for remote audio
        this.$refs.remoteVideo.muted = false
        this.$refs.remoteVideo.srcObject = stream
        
        // Force play the video
        this.$refs.remoteVideo.play().catch(e => {
          console.log('Remote video play error:', e)
        })
        
        // Add event listeners to debug remote video loading
        this.$refs.remoteVideo.onloadedmetadata = () => {
          console.log('Remote video metadata loaded with auto refresh')
          console.log('Remote video dimensions:', this.$refs.remoteVideo.videoWidth, 'x', this.$refs.remoteVideo.videoHeight)
        }
        this.$refs.remoteVideo.oncanplay = () => {
          console.log('Remote video can play with auto refresh')
          // Force play again when ready
          this.$refs.remoteVideo.play().catch(e => console.log('Remote video play error:', e))
        }
        this.$refs.remoteVideo.onerror = (error) => {
          console.error('Remote video error with auto refresh:', error)
        }
        
        // Log audio track information
        const audioTracks = stream.getAudioTracks()
        const videoTracks = stream.getVideoTracks()
        console.log('Remote audio tracks:', audioTracks.length)
        console.log('Remote video tracks:', videoTracks.length)
        
        audioTracks.forEach((track, index) => {
          console.log(`Audio track ${index}:`, {
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            id: track.id
          })
        })
        
        videoTracks.forEach((track, index) => {
          console.log(`Video track ${index}:`, {
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            id: track.id
          })
        })
      } else {
        console.error('Remote video element not found for auto refresh')
      }
    }
  },
  
  // Poll for online users every 5 seconds when logged in
  watch: {
    isLoggedIn(newVal) {
      if (newVal) {
        this.fetchOnlineUsers()
        this.userPollingInterval = setInterval(() => {
          this.fetchOnlineUsers()
        }, 5000)
      } else {
        if (this.userPollingInterval) {
          clearInterval(this.userPollingInterval)
          this.userPollingInterval = null
        }
      }
    },
    
    // Watch for call state changes to automatically refresh video
    callState(newState, oldState) {
      console.log(`Call state changed from ${oldState} to ${newState}`)
      
      if (newState === 'connected') {
        console.log('🔄 Call connected - automatically refreshing video elements')
        this.$nextTick(() => {
          // Force refresh both local and remote video
          this.forceRefreshVideoElements()
          
          // Also set up remote video if we have a stream
          const remoteStream = this.webRTCService.getRemoteStream()
          if (remoteStream) {
            this.setupRemoteVideoWithAutoRefresh(remoteStream)
          }
          
          // Force refresh remote video specifically
          this.forceRefreshRemoteVideo()
          
          // Retry video refresh after a short delay to ensure everything is ready
          setTimeout(() => {
            console.log('🔄 Retrying video refresh after connection...')
            this.forceRefreshVideoElements()
            this.forceRefreshRemoteVideo()
          }, 1000)
        })
      } else if (newState === 'connecting') {
        console.log('🔄 Call connecting - setting up local video')
        this.$nextTick(() => {
          this.setupLocalVideoWithAutoRefresh()
        })
      } else if (newState === 'incoming') {
        console.log('🔄 Incoming call - preparing video setup')
        // Don't set up video yet, wait for user to accept
      } else if (newState === 'ended') {
        console.log('🔄 Call ended - cleaning up video elements')
        this.$nextTick(() => {
          // Clear video elements
          if (this.$refs.localVideo) {
            this.$refs.localVideo.srcObject = null
          }
          if (this.$refs.remoteVideo) {
            this.$refs.remoteVideo.srcObject = null
          }
        })
      }
    },
    
    // Watch for call start to set up video
    isInCall(newVal, oldVal) {
      if (newVal && !oldVal) {
        console.log('🔄 Call started - setting up video elements')
        this.$nextTick(() => {
          this.setupLocalVideoWithAutoRefresh()
        })
      }
    }
  }
}
</script>

<style>
/* Video Styles */
.video-container {
  display: flex;
  gap: 20px;
  margin: 20px 0;
  flex-wrap: wrap;
}

.video-wrapper {
  flex: 1;
  min-width: 300px;
  text-align: center;
}

.video-wrapper h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 14px;
}

.video-stream {
  width: 100%;
  max-width: 400px;
  height: 300px;
  background-color: #000;
  border-radius: 8px;
  object-fit: cover;
  border: 2px solid #ddd;
}

.local-video {
  border-color: #4CAF50;
}

.remote-video {
  border-color: #2196F3;
}

/* Button Styles */
.button-group {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.btn-debug {
  background: #ff9800;
  color: white;
  font-size: 14px;
  padding: 8px 16px;
}

.btn-debug:hover {
  background: #f57c00;
  box-shadow: 0 5px 15px rgba(255, 152, 0, 0.4);
}

.btn-devices {
  background: #2196F3;
  color: white;
  font-size: 14px;
  padding: 8px 16px;
}

.btn-devices:hover {
  background: #1976D2;
  box-shadow: 0 5px 15px rgba(33, 150, 243, 0.4);
}

.btn-test {
  background: #9C27B0;
  color: white;
  font-size: 14px;
  padding: 8px 16px;
}

.btn-test:hover {
  background: #7B1FA2;
  box-shadow: 0 5px 15px rgba(156, 39, 176, 0.4);
}

/* Responsive design */
@media (max-width: 768px) {
  .video-container {
    flex-direction: column;
  }
  
  .video-wrapper {
    min-width: auto;
  }
  
  .video-stream {
    height: 200px;
  }
}

.status-badge.available {
  background: #28a745;
  color: white;
}

.status-badge.busy {
  background: #dc3545;
  color: white;
}

.status-badge.incoming {
  background: #ffc107;
  color: #212529;
}

.status-badge.broadcast {
  background: #17a2b8;
  color: white;
}

.status-badge.direct {
  background: #6c757d;
  color: white;
}

.btn-accept {
  background: #28a745;
  color: white;
  margin-right: 10px;
}

.btn-accept:hover {
  background: #218838;
  box-shadow: 0 5px 15px rgba(40, 167, 69, 0.4);
}

.btn-reject {
  background: #dc3545;
  color: white;
  margin-right: 10px;
}

.btn-reject:hover {
  background: #c82333;
  box-shadow: 0 5px 15px rgba(220, 53, 69, 0.4);
}

.btn-broadcast {
  background: #17a2b8;
  color: white;
  font-size: 16px;
  padding: 12px 24px;
  margin: 10px 0;
}

.btn-broadcast:hover {
  background: #138496;
  box-shadow: 0 5px 15px rgba(23, 162, 184, 0.4);
}

.btn-broadcast:disabled {
  background: #6c757d;
  cursor: not-allowed;
  box-shadow: none;
}

.broadcast-section {
  margin-top: 20px;
}

.broadcast-info {
  background: #e3f2fd;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
  border-left: 4px solid #2196F3;
}

.broadcast-info p {
  margin: 5px 0;
  color: #1976d2;
}

/* Radio button styles */
.radio-group {
  display: flex;
  gap: 20px;
  margin-top: 5px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-size: 14px;
}

.radio-label input[type="radio"] {
  margin: 0;
}

.feature-info {
  margin-top: 10px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 5px;
  border-left: 3px solid #007bff;
}

.feature-info small {
  color: #6c757d;
  line-height: 1.4;
}
</style> 