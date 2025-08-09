// profilePhotoRoute.js (Full Cloudinary integration)
import express from "express";
import multer from "multer";
import admin from './firebaseAdmin.js';
import { cloudinary, storage } from './cloudinary.js';

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('🔍 Multer fileFilter:', {
      originalname: file.originalname,
      mimetype: file.mimetype
    });
    
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

const router = express.Router();

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    console.log('🔐 Authenticating user...');
    const sessionCookie = req.cookies.session || '';
    
    if (!sessionCookie) {
      console.log('❌ No session cookie found');
      return res.status(401).json({ error: 'No session cookie found' });
    }
    
    const decoded = await admin.auth().verifySessionCookie(sessionCookie, true);
    console.log('✅ User authenticated:', decoded.uid);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Auth error:', error);
    return res.status(401).json({ error: 'Unauthorized', details: error.message });
  }
};

// Test route
router.get('/test', (req, res) => {
  console.log('📍 Test route hit');
  res.json({ message: 'Profile route is working!' });
});

// POST /api/profile/photo
router.post("/photo", authenticateUser, upload.single("photo"), async (req, res) => {
  console.log("📁 Photo upload route hit");
  console.log("📁 User:", req.user?.uid);
  console.log("📁 File received:", !!req.file);
  
  if (req.file) {
    console.log("📁 File details:", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      cloudinaryPath: req.file.path
    });
  }
  
  try {
    if (!req.file) {
      console.log('❌ No file received');
      return res.status(400).json({ error: "No photo uploaded" });
    }
    
    if (!req.file.path) {
      console.log('❌ No Cloudinary path received');
      return res.status(500).json({ error: "Upload failed - no file path from Cloudinary" });
    }

    console.log('✅ File uploaded to Cloudinary:', req.file.path);
    
    // Update user profile in Firestore with new photo URL
    try {
      const userRef = admin.firestore().collection('users').doc(req.user.uid);
      await userRef.update({
        photoURL: req.file.path,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Updated photoURL for user ${req.user.uid}`);
    } catch (firestoreError) {
      console.warn('⚠️ Failed to update Firestore profile:', firestoreError);
      // Don't fail the request if Firestore update fails
    }
    
    const responseData = { 
      url: req.file.path,
      success: true,
      message: 'Photo uploaded successfully'
    };
    
    console.log('📤 Sending response:', responseData);
    res.json(responseData);
    
  } catch (err) {
    console.error('❌ Upload error:', err);
    res.status(500).json({ 
      error: "Upload failed", 
      details: err.message 
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('❌ Route error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: 'Upload error: ' + error.message });
  }
  
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({ error: 'Only image files are allowed!' });
  }
  
  res.status(500).json({ error: 'Something went wrong!', details: error.message });
});

export default router;