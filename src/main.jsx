import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Simple performance check for mobile/low-end devices
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (isMobile && !localStorage.getItem('performanceMode')) {
  localStorage.setItem('performanceMode', 'low');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)