import { io } from 'socket.io-client';

// --- 🔑 Paste fresh ID token and Task ID ---
const ID_TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjZkZTQwZjA0ODgxYzZhMDE2MTFlYjI4NGE0Yzk1YTI1MWU5MTEyNTAiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiTGFsaXQgUm91dCIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NMRUctV2xPR3d6bm0wYmVWTDNOVzN1QXZhZkdTdmNyNk5oX3AyT2tGVUo1aG9JWnc9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vYXV0aGVudGljYXRpb24tNmFmMzQiLCJhdWQiOiJhdXRoZW50aWNhdGlvbi02YWYzNCIsImF1dGhfdGltZSI6MTc1Mzg2MTE5NywidXNlcl9pZCI6InRUT2I3UU9LcHlUYXVYcHFuVDdHQW9ZcXczMDMiLCJzdWIiOiJ0VE9iN1FPS3B5VGF1WHBxblQ3R0FvWXF3MzAzIiwiaWF0IjoxNzUzODYxMjA4LCJleHAiOjE3NTM4NjQ4MDgsImVtYWlsIjoibGFsaXRzbnJvdXRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMDg0MzgzNTY2MzgxMjU0NzQ2ODUiXSwiZW1haWwiOlsibGFsaXRzbnJvdXRAZ21haWwuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.HCjD_b6IRUJseqbHY1GapHUOZcXMFIJ4-rvli2l712rk5O_ecBTwn4kGHhpJz_aXnBvg3YwSlh0sBUidm3l3rTiYY2HDyZR7mYB_NCVxdL1QLjTt7KbOX1mvJIXYp5YWb_sSnXZJW3QCyAcPIXC_3oJZrtXU6WFmu0qISY-wvlM0K_2wkWjRc18ZiR15TGORAAXCXG2iCTWClXltJ8-l0TvINVgvsPNoIxZxRkJ96qyl-eox2g9QbOTCUGWHdBoG4tfa4Dp3x2MmtvYdQ5ve6pHJBby0lYpEahegKQyrjP8SGDbZZT0KvNA3WVFbkjeddLVjHnFhB4n2C0-TrODTPA'; // get from window.copyIdToken()
const TASK_ID = 'DCFOApyJK5PPpxi5jpOD'; // the Firestore task where you're postedBy or acceptedBy

if (!ID_TOKEN || !TASK_ID) {
  console.error('❌ Missing ID_TOKEN or TASK_ID');
  process.exit(1);
}

// --- Connect to Socket.IO server ---
const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  auth: { token: ID_TOKEN },
});

// --- Events ---
socket.on('connect', () => {
  console.log('✅ Connected as socket.id:', socket.id);
  console.log('➡️  Joining task room:', TASK_ID);
  socket.emit('chat:join', { taskId: TASK_ID });
});

socket.on('chat:joined', (data) => {
  console.log('✅ Joined room for task:', data.taskId);
  console.log('➡️  Sending test message...');
  socket.emit('chat:message', {
    taskId: TASK_ID,
    text: `Hello from test client @ ${new Date().toLocaleTimeString()}`,
  });
});

socket.on('chat:new', (msg) => {
  console.log('📩 New message event:', msg);
});

socket.on('chat:error', (msg) => {
  console.log('❌ chat:error:', msg);
});

socket.on('connect_error', (err) => {
  console.error('❌ connect_error:', err.message);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});
