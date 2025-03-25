// FirebaseAnalytics.js - With Debugging

import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent, setAnalyticsCollectionEnabled } from 'firebase/analytics';

// Debug mode flag - Set to true during development, false in production
const DEBUG = true;

// Your Firebase configuration with actual values
const firebaseConfig = {
  apiKey: "AIzaSyCPQjgQRgP_Rry7tiGYZPsllylvRrA-CBA",
  authDomain: "bubblednebula.firebaseapp.com",
  projectId: "bubblednebula",
  storageBucket: "bubblednebula.firebasestorage.app",
  messagingSenderId: "77925978756",
  appId: "1:77925978756:web:2cde8b673475b7efe968d1",
  measurementId: "G-P8KNL5KY1Z"
};

// Global analytics variable
let analytics = null;
let isInitialized = false;

// Enable debug mode for local development
if (DEBUG && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  window.localStorage.setItem('firebase:analytics:debug', 'true');
  console.log("🔥 Firebase Analytics debug mode ENABLED");
}

// Initialize Firebase
export const initFirebase = () => {
  try {
    // Only initialize once
    if (isInitialized) {
      console.log("🔥 Firebase already initialized");
      return true;
    }
    
    const app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    isInitialized = true;
    
    if (DEBUG) {
      console.log("🔥 Firebase Analytics initialized successfully");
      setAnalyticsCollectionEnabled(analytics, true);
      console.log("🔥 Analytics collection enabled");
    }
    
    // Track page view
    logEvent(analytics, 'page_view', {
      page_title: 'Main Experience',
      page_location: window.location.href
    });
    
    if (DEBUG) {
      console.log("🔥 Tracked event: page_view", {
        page_title: 'Main Experience',
        page_location: window.location.href
      });
    }
    
    return true;
  } catch (error) {
    console.error("❌ Firebase initialization error:", error);
    return false;
  }
};

// Track recording event
export const trackRecording = () => {
  if (!analytics) {
    if (DEBUG) console.error("❌ Analytics not initialized: Cannot track recording_started");
    return false;
  }
  
  try {
    logEvent(analytics, 'recording_started');
    
    if (DEBUG) {
      console.log("🔥 Tracked event: recording_started");
    }
    return true;
  } catch (error) {
    if (DEBUG) console.error("❌ Error tracking recording:", error);
    return false;
  }
};

// Track download event with parameters
export const trackDownload = (format = 'wav', duration = 0) => {
  if (!analytics) {
    if (DEBUG) console.error("❌ Analytics not initialized: Cannot track recording_downloaded");
    return false;
  }
  
  try {
    const eventParams = {
      file_format: format,
      duration_seconds: duration
    };
    
    logEvent(analytics, 'recording_downloaded', eventParams);
    
    if (DEBUG) {
      console.log("🔥 Tracked event: recording_downloaded", eventParams);
    }
    return true;
  } catch (error) {
    if (DEBUG) console.error("❌ Error tracking download:", error);
    return false;
  }
};

// Track ad click with enhanced debugging
export const trackAdClick = (adTitle) => {
  if (!analytics) {
    if (DEBUG) console.error("❌ Analytics not initialized: Cannot track ad_clicked");
    return false;
  }
  
  try {
    const eventParams = {
      ad_title: adTitle || "Unknown Ad"
    };
    
    logEvent(analytics, 'ad_clicked', eventParams);
    
    if (DEBUG) {
      console.log("🔥 Tracked event: ad_clicked", eventParams);
    }
    return true;
  } catch (error) {
    if (DEBUG) console.error("❌ Error tracking ad click:", error);
    return false;
  }
};

// Helper to check if Firebase Analytics is available
export const isAnalyticsAvailable = () => {
  return isInitialized && analytics !== null;
};

// Helper to check if debug mode is enabled
export const isDebugMode = () => {
  return DEBUG;
};