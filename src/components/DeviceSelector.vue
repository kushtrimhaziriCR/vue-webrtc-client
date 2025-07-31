<template>
  <div v-if="show" class="device-selector-overlay">
    <div class="device-selector">
      <div class="device-selector-header">
        <h3>Select Devices</h3>
        <button class="close-btn" @click="closeSelector">×</button>
      </div>
      
      <div class="device-selector-content">
        <!-- Camera Selection -->
        <div class="device-section">
          <h4>📹 Camera</h4>
          <div class="device-list">
            <div 
              v-for="camera in cameras" 
              :key="camera.deviceId"
              :class="['device-option', { selected: selectedCamera === camera.deviceId }]"
              @click="selectCamera(camera.deviceId)"
            >
              <div class="device-info">
                <span class="device-name">{{ camera.label || `Camera ${camera.deviceId.slice(0, 8)}...` }}</span>
                <span class="device-id">{{ camera.deviceId.slice(0, 20) }}...</span>
              </div>
              <div class="device-status">
                <span v-if="selectedCamera === camera.deviceId" class="selected-indicator">✓</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Microphone Selection -->
        <div class="device-section">
          <h4>🎤 Microphone</h4>
          <div class="device-list">
            <div 
              v-for="microphone in microphones" 
              :key="microphone.deviceId"
              :class="['device-option', { selected: selectedMicrophone === microphone.deviceId }]"
              @click="selectMicrophone(microphone.deviceId)"
            >
              <div class="device-info">
                <span class="device-name">{{ microphone.label || `Microphone ${microphone.deviceId.slice(0, 8)}...` }}</span>
                <span class="device-id">{{ microphone.deviceId.slice(0, 20) }}...</span>
              </div>
              <div class="device-status">
                <span v-if="selectedMicrophone === microphone.deviceId" class="selected-indicator">✓</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Test Video Preview -->
        <div class="device-section" v-if="selectedCamera">
          <h4>📺 Camera Preview</h4>
          <div class="video-preview-container">
            <video 
              ref="previewVideo" 
              autoplay 
              muted 
              playsinline
              class="video-preview"
            ></video>
            <div v-if="!previewActive" class="preview-placeholder">
              <span>Camera preview will appear here</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="device-selector-actions">
        <button class="btn btn-secondary" @click="refreshDevices">
          🔄 Refresh Devices
        </button>
        <button class="btn btn-primary" @click="confirmSelection" :disabled="!selectedCamera || !selectedMicrophone">
          Confirm Selection
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DeviceSelector',
  props: {
    show: {
      type: Boolean,
      default: false
    }
  },
  
  data() {
    return {
      cameras: [],
      microphones: [],
      selectedCamera: null,
      selectedMicrophone: null,
      previewStream: null,
      previewActive: false
    }
  },
  
  watch: {
    show(newVal) {
      if (newVal) {
        this.loadDevices()
      } else {
        this.stopPreview()
      }
    },
    
    selectedCamera(newCameraId) {
      if (newCameraId) {
        this.startPreview(newCameraId)
      }
    }
  },
  
  methods: {
    async loadDevices() {
      try {
        console.log('Loading available devices...')
        
        // Request permissions first with better error handling
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        } catch (permError) {
          console.error('Permission error:', permError)
          if (permError.name === 'NotAllowedError') {
            alert('Camera/microphone permission denied. Please allow access in your browser settings and refresh the page.')
          } else if (permError.name === 'NotFoundError') {
            alert('No camera or microphone found on this device.')
          } else if (permError.name === 'NotReadableError') {
            alert('Camera or microphone is being used by another application. Please close other apps using camera/microphone.')
          } else {
            alert(`Failed to access camera/microphone: ${permError.message}`)
          }
          return
        }
        
        const devices = await navigator.mediaDevices.enumerateDevices()
        
        this.cameras = devices.filter(device => device.kind === 'videoinput')
        this.microphones = devices.filter(device => device.kind === 'audioinput')
        
        console.log('Found cameras:', this.cameras.length)
        console.log('Found microphones:', this.microphones.length)
        
        // Auto-select first available devices
        if (this.cameras.length > 0 && !this.selectedCamera) {
          this.selectedCamera = this.cameras[0].deviceId
        }
        if (this.microphones.length > 0 && !this.selectedMicrophone) {
          this.selectedMicrophone = this.microphones[0].deviceId
        }
        
      } catch (error) {
        console.error('Failed to load devices:', error)
        alert('Failed to access camera/microphone. Please check permissions and try refreshing the page.')
      }
    },
    
    selectCamera(deviceId) {
      this.selectedCamera = deviceId
    },
    
    selectMicrophone(deviceId) {
      this.selectedMicrophone = deviceId
    },
    
    async startPreview(cameraId) {
      try {
        // Stop existing preview
        this.stopPreview()
        
        // Start new preview
        this.previewStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: cameraId }
          },
          audio: false
        })
        
        if (this.$refs.previewVideo) {
          this.$refs.previewVideo.srcObject = this.previewStream
          this.previewActive = true
        }
        
      } catch (error) {
        console.error('Failed to start camera preview:', error)
        this.previewActive = false
      }
    },
    
    stopPreview() {
      if (this.previewStream) {
        this.previewStream.getTracks().forEach(track => track.stop())
        this.previewStream = null
      }
      this.previewActive = false
    },
    
    async refreshDevices() {
      this.stopPreview()
      await this.loadDevices()
    },
    
    confirmSelection() {
      if (this.selectedCamera && this.selectedMicrophone) {
        this.$emit('devices-selected', {
          cameraId: this.selectedCamera,
          microphoneId: this.selectedMicrophone
        })
        this.closeSelector()
      }
    },
    
    closeSelector() {
      this.stopPreview()
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.device-selector-overlay {
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

.device-selector {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;
}

.device-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  border-bottom: 1px solid #eee;
}

.device-selector-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.5rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.close-btn:hover {
  background: #f0f0f0;
}

.device-selector-content {
  padding: 30px;
}

.device-section {
  margin-bottom: 30px;
}

.device-section h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 1.1rem;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.device-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 2px solid #eee;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.device-option:hover {
  border-color: #2196F3;
  background: #f8f9fa;
}

.device-option.selected {
  border-color: #4CAF50;
  background: #e8f5e8;
}

.device-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.device-name {
  font-weight: 600;
  color: #333;
}

.device-id {
  font-size: 12px;
  color: #666;
  font-family: monospace;
}

.device-status {
  display: flex;
  align-items: center;
}

.selected-indicator {
  color: #4CAF50;
  font-weight: bold;
  font-size: 18px;
}

.video-preview-container {
  position: relative;
  width: 100%;
  height: 200px;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.video-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  background: #f0f0f0;
}

.device-selector-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  padding: 20px 30px;
  border-top: 1px solid #eee;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:hover {
  transform: translateY(-2px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-primary {
  background: #4CAF50;
  color: white;
}

.btn-primary:hover {
  box-shadow: 0 5px 15px rgba(76, 175, 80, 0.4);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
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
</style> 