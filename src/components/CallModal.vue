<template>
  <div v-if="show" class="call-modal-overlay">
    <div class="call-modal">
      <div class="call-modal-header">
        <h3>Incoming Call</h3>
      </div>
      
      <div class="call-modal-content">
        <div class="caller-info">
          <div class="caller-avatar">
            <span>{{ callerName.charAt(0).toUpperCase() }}</span>
          </div>
          <div class="caller-details">
            <h4>{{ callerName }}</h4>
            <p>{{ callerMetadata || 'No additional info' }}</p>
          </div>
        </div>
        
        <div class="call-status">
          <p v-if="callState === 'incoming'">📞 Incoming call...</p>
          <p v-else-if="callState === 'connecting'">🔄 Connecting...</p>
          <p v-else-if="callState === 'connected'">✅ Call connected</p>
          <p v-else-if="callState === 'ended'">📞 Call ended</p>
        </div>
        
        <!-- Video Streams for Connected Calls -->
        <div v-if="callState === 'connected'" class="video-container">
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
          <div class="video-wrapper">
            <h4>Remote Video</h4>
            <video 
              ref="remoteVideo" 
              autoplay 
              playsinline
              class="video-stream remote-video"
            ></video>
          </div>
        </div>
      </div>
      
      <div class="call-modal-actions">
        <button 
          v-if="callState === 'incoming'"
          class="btn btn-accept" 
          @click="acceptCall"
          :disabled="accepting"
        >
          {{ accepting ? 'Accepting...' : 'Accept' }}
        </button>
        
        <button 
          v-if="callState === 'incoming'"
          class="btn btn-reject" 
          @click="rejectCall"
          :disabled="accepting"
        >
          Reject
        </button>
        
        <button 
          v-if="callState === 'connected'"
          class="btn btn-end" 
          @click="endCall"
        >
          End Call
        </button>
        
        <button 
          v-if="callState === 'ended'"
          class="btn btn-close" 
          @click="closeModal"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CallModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    callerId: {
      type: String,
      default: ''
    },
    callerMetadata: {
      type: String,
      default: ''
    },
    callState: {
      type: String,
      default: 'incoming' // 'incoming', 'connecting', 'connected', 'ended'
    },
    localStream: {
      type: Object,
      default: null
    },
    remoteStream: {
      type: Object,
      default: null
    }
  },
  
  data() {
    return {
      accepting: false
    }
  },
  
  computed: {
    callerName() {
      return this.callerId || 'Unknown Caller'
    }
  },
  
  watch: {
    localStream(newStream) {
      if (newStream && this.$refs.localVideo) {
        this.$refs.localVideo.srcObject = newStream
      }
    },
    
    remoteStream(newStream) {
      if (newStream && this.$refs.remoteVideo) {
        this.$refs.remoteVideo.srcObject = newStream
      }
    }
  },
  
  methods: {
    acceptCall() {
      this.accepting = true
      this.$emit('accept-call')
    },
    
    rejectCall() {
      this.$emit('reject-call')
    },
    
    endCall() {
      this.$emit('end-call')
    },
    
    closeModal() {
      this.$emit('close-modal')
    }
  }
}
</script>

<style scoped>
.call-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.call-modal {
  background: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 800px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;
}

.call-modal-header h3 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 1.5rem;
}

.caller-info {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
}

.caller-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
}

.caller-details h4 {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 1.2rem;
}

.caller-details p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.call-status {
  margin-bottom: 30px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.call-status p {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.call-modal-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  min-width: 100px;
}

.btn:hover {
  transform: translateY(-2px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-accept {
  background: #28a745;
  color: white;
}

.btn-accept:hover {
  box-shadow: 0 5px 15px rgba(40, 167, 69, 0.4);
}

.btn-reject {
  background: #dc3545;
  color: white;
}

.btn-reject:hover {
  box-shadow: 0 5px 15px rgba(220, 53, 69, 0.4);
}

.btn-end {
  background: #dc3545;
  color: white;
}

.btn-end:hover {
  box-shadow: 0 5px 15px rgba(220, 53, 69, 0.4);
}

.btn-close {
  background: #6c757d;
  color: white;
}

.btn-close:hover {
  box-shadow: 0 5px 15px rgba(108, 117, 125, 0.4);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { 
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Video Styles */
.video-container {
  display: flex;
  gap: 20px;
  margin: 20px 0;
  flex-wrap: wrap;
  justify-content: center;
}

.video-wrapper {
  flex: 1;
  min-width: 250px;
  text-align: center;
}

.video-wrapper h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 14px;
}

.video-stream {
  width: 100%;
  max-width: 300px;
  height: 225px;
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
</style> 