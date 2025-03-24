// DeviceDetector.js
export const detectMobileDevice = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // Check if device is mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    // Check if device has touch capability
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Check for low-end device
    const isLowEnd = 
      (navigator.deviceMemory && navigator.deviceMemory < 4) || 
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4);
    
    return {
      isMobile,
      hasTouch, 
      isLowEnd,
      isTablet: isMobile && Math.min(window.innerWidth, window.innerHeight) > 480,
      isPhone: isMobile && Math.min(window.innerWidth, window.innerHeight) <= 480,
      isLandscape: window.innerWidth > window.innerHeight,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight
    };
  };
  
  export const useDeviceDetector = () => {
    const [deviceInfo, setDeviceInfo] = useState(detectMobileDevice());
    
    useEffect(() => {
      const handleResize = () => {
        setDeviceInfo(detectMobileDevice());
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    return deviceInfo;
  };