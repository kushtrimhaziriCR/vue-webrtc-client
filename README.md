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
- Your Spring Boot WebRTC server running on production URL
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

### Development

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:3000`

### Production Build

1. Build the application:
   ```bash
   npm run build
   ```

2. Preview the production build:
   ```bash
   npm run preview
   ```

## Deployment to Netlify

### Automatic Deployment (Recommended)

1. **Connect to GitHub**: 
   - Go to [Netlify](https://netlify.com)
   - Click "New site from Git"
   - Choose GitHub and select your repository: `kushtrimhaziriCR/vue-webrtc-client`

2. **Configure Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `18`

3. **Deploy**: Netlify will automatically build and deploy your site

### Manual Deployment

1. Build your project:
   ```bash
   npm run build
   ```

2. Drag and drop the `dist` folder to Netlify's deploy area

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
- **STUN/TURN servers** for NAT traversal
- **Call status indicators** (Available, In Call, Busy)
- **Simple call modal** with accept/reject/end options
- **Automatic call cleanup** when connection is lost

## API Endpoints Used

- **WebSocket**: `wss://gateway.dev.api.conroo.com/ws/v1/webrtc/signaling`
- **REST API**: `https://gateway.dev.api.conroo.com/api/v1/webrtc/users/online`

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
- **STUN/TURN servers** for NAT traversal
- **SDP offer/answer exchange** through WebSocket signaling
- **ICE candidate exchange** for connection establishment

## Configuration

The server URLs are configured in `src/App.vue`:

```javascript
wsUrl: 'wss://gateway.dev.api.conroo.com/ws/v1/webrtc/signaling'
```

And the REST API URL in the `fetchOnlineUsers` method.

## Troubleshooting

1. **Connection Issues**: Make sure your Spring Boot server is running and accessible
2. **CORS Issues**: Ensure your Spring Boot server has CORS configured to allow requests from your Netlify domain
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

## About

No description, website, or topics provided. 