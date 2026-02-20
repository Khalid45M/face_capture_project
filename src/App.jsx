import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import './App.css';

// بيانات Cloudinary الخاصة بك (قم بالتأكد من الـ Cloud Name)
const CLOUD_NAME = "ds8cvj0d9"; 
const UPLOAD_PRESET = "face_capture_project"; 

function App() {
  const [personName, setPersonName] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const webcamRef = useRef(null);

  const stages = [
    { label: 'Front', count: 4 },
    { label: 'Right_Profile', count: 4 },
    { label: 'Left_Profile', count: 4 },
    { label: 'Forehead_Up', count: 4 },
    { label: 'Chin_Down', count: 4 }
  ];

  // مكون قالب الوجه التوجيهي
  const FaceOverlay = ({ stage }) => {
    let offsetX = 0; let offsetY = 0;
    if (stage === 'Right_Profile') offsetX = 35;
    if (stage === 'Left_Profile') offsetX = -35;
    if (stage === 'Forehead_Up') offsetY = -25;
    if (stage === 'Chin_Down') offsetY = 25;

    return (
      <div className="face-guide-container">
        <svg viewBox="0 0 400 400" className="face-svg">
          <ellipse cx="200" cy="200" rx="90" ry="120" className="guide-outline" />
          <g style={{ transform: `translate(${offsetX}px, ${offsetY}px)`, transition: 'all 0.8s ease' }}>
            <circle cx="170" cy="185" r="8" className="guide-feature" />
            <circle cx="230" cy="185" r="8" className="guide-feature" />
            <path d="M200 205 L195 235 L205 235 Z" className="guide-feature" />
            <path d="M175 265 Q200 285 225 265" className="guide-feature" fill="none" />
          </g>
        </svg>
      </div>
    );
  };

  const startCamera = () => {
    if (!personName.trim()) { alert('Please enter subject name'); return; }
    setIsCameraActive(true);
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const startCaptureProcess = async () => {
    setCapturedImages([]);
    setIsCapturing(true);
    
    for (let stage of stages) {
      setCurrentStage(stage.label);
      for (let i = 3; i > 0; i--) { setCountdown(i); await sleep(1000); }
      setCountdown(0);

      for (let j = 0; j < stage.count; j++) {
        if (webcamRef.current) {
          const imageSrc = webcamRef.current.getScreenshot();
          setCapturedImages(prev => [...prev, { src: imageSrc, angle: stage.label }]);
          await sleep(1000); 
        }
      }
      setCurrentStage('Moving to next pose...');
      await sleep(1500);
    }
    setIsCapturing(false);
    setCurrentStage('Complete!');
  };

  const uploadToCloudinary = async () => {
    setIsUploading(true);
    const folderName = personName.replace(/\s+/g, '_');

    try {
      for (let i = 0; i < capturedImages.length; i++) {
        const formData = new FormData();
        formData.append('file', capturedImages[i].src);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('public_id', `${folderName}/${folderName}_${capturedImages[i].angle}_${i + 1}`);

        await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData,
        });
      }
      alert("All images uploaded successfully to Cloudinary!");
    } catch (error) {
      alert("Upload failed. Check your Cloud Name.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <h1>📸 Face Data Cloud Sync</h1>
        
        <div className="input-group">
          <input 
            type="text" 
            placeholder="Enter Subject Name (English)" 
            value={personName} 
            onChange={(e) => setPersonName(e.target.value)} 
            disabled={isCameraActive}
          />
        </div>

        {isCameraActive ? (
          <div className="camera-wrapper">
            <div className="camera-container">
              <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="webcam" mirrored={true} />
              {isCapturing && <FaceOverlay stage={currentStage} />}
              {isCapturing && (
                <div className="overlay-instruction">
                  <div className="stage-label">{currentStage.replace('_', ' ')}</div>
                  {countdown > 0 && <div className="countdown-timer">{countdown}</div>}
                </div>
              )}
            </div>
            <div className="button-group">
              {!isCapturing && (
                <button onClick={startCaptureProcess} className="btn btn-primary">
                  {capturedImages.length > 0 ? '🔄 Retake All' : '⏺ Start Collection'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <button onClick={startCamera} className="btn btn-success btn-large">Open Camera</button>
        )}

        {capturedImages.length > 0 && (
          <div className="gallery-section">
            <div className="gallery-header">
              <h3>Captured: {capturedImages.length} Images</h3>
              <button onClick={uploadToCloudinary} className="btn btn-success" disabled={isUploading}>
                {isUploading ? "📤 Uploading..." : "☁️ Sync to Cloudinary"}
              </button>
            </div>
            <div className="gallery-grid">
              {capturedImages.map((img, index) => (
                <div key={index} className="gallery-item">
                  <img src={img.src} alt="cap" />
                  <span className="gallery-tag">{img.angle}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isCameraActive && (
          <div className="footer-actions">
            <button onClick={() => {setIsCameraActive(false); setCapturedImages([]);}} className="btn btn-secondary btn-full">Close & Reset</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;