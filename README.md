# Vue WebRTC Client

A simple Vue.js web application that connects to your Spring Boot WebRTC signaling server to manage user sessions and make peer-to-peer audio calls.

## Features

- **WebSocket Connection**: Connects to the Spring Boot WebRTC signaling server
- **User Session Management**: Go online/offline with custom user ID and metadata
- **Real-time User Display**: Shows all connected users with their status
- **Audio Calls**: Make peer-to-peer audio calls with other users
- **Call Management**: Accept, reject, and end calls with a simple modal interface
- **Connection Status**: Visual indicators for connection state
- **Auto-reconnection**: Automatically attempts to reconnect if connection is lost
- **Modern UI**: Clean, responsive design with smooth animations

## Prerequisites

- Node.js (v14 or higher)
- Your Spring Boot WebRTC server running on `localhost:8081`
- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)

## Installation

1. Navigate to the vue-webrtc-client directory:
   ```bash
   cd vue-webrtc-client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Connect to Server**: The app will automatically attempt to connect to the WebSocket server
2. **Go Online**: Enter your user ID and optional metadata, then click "Go Online"
3. **View Users**: Once online, you'll see all other connected users with their status
4. **Make Calls**: Click the "Call" button on any available user to initiate an audio call
5. **Handle Incoming Calls**: When someone calls you, a modal will appear with accept/reject options
6. **End Calls**: Use the "End Call" button to terminate active calls
7. **Go Offline**: Click "Go Offline" to disconnect your user session

## Call Features

- **Audio-only calls** using WebRTC peer connections
- **Google STUN servers** for NAT traversal
- **Call status indicators** (Available, In Call, Busy)
- **Simple call modal** with accept/reject/end options
- **Automatic call cleanup** when connection is lost

## API Endpoints Used

- **WebSocket**: `ws://localhost:8081/ws/v1/webrtc/signaling`
- **REST API**: `http://localhost:8081/api/v1/webrtc/users/online`

## WebSocket Message Types

The client sends and handles these message types:

- `USER_ONLINE`: Register user with the server
- `USER_OFFLINE`: Unregister user from the server
- `OFFER`: WebRTC SDP offer for call initiation
- `ANSWER`: WebRTC SDP answer for call acceptance
- `ICE_CANDIDATE`: ICE candidate exchange for connection establishment
- `CALL_REJECT`: Reject incoming call
- `CALL_END`: End active call

## WebRTC Implementation

The app uses native WebRTC APIs with:

- **RTCPeerConnection** for peer-to-peer connections
- **getUserMedia** for audio stream capture
- **Google STUN servers** for NAT traversal
- **SDP offer/answer exchange** through WebSocket signaling
- **ICE candidate exchange** for connection establishment

## Configuration

You can modify the server URLs in `src/App.vue`:

```javascript
wsUrl: 'ws://localhost:8081/ws/v1/webrtc/signaling'
```

And the REST API URL in the `fetchOnlineUsers` method.

## Building for Production

To build the application for production:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Troubleshooting

1. **Connection Issues**: Make sure your Spring Boot server is running on port 8081
2. **CORS Issues**: Ensure your Spring Boot server has CORS configured to allow requests from `http://localhost:3000`
3. **WebSocket Issues**: Check that the WebSocket endpoint is correctly configured in your Spring Boot application
4. **Audio Issues**: Make sure your browser has permission to access the microphone
5. **Call Issues**: Check browser console for WebRTC-related errors

## Browser Permissions

The app requires microphone access for audio calls. When prompted, allow microphone access to enable calling functionality.

## Next Steps

This version includes basic audio calling functionality. Future enhancements could include:

- Video calls with camera streams
- Screen sharing
- Group calls
- Call recording
- Advanced call controls (mute, hold, transfer)
- Better error handling and user feedback 