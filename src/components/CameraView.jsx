import React from 'react';
import Webcam from 'react-webcam';

function CameraView({ 
  modelLoading, 
  isCameraActive, 
  setIsCameraActive, 
  webcamRef, 
  isCapturing, 
  currentStage, 
  countdown, 
  warningMessage, 
  startCaptureSequence,
  startCamera
}) {
  if (modelLoading) {
    return (
      <div className="camera-placeholder-card">
        <p style={{ color: '#fff' }}>🔄 جاري تحميل وتجهيز نموذج تتبع ملامح الوجه الذكي...</p>
      </div>
    );
  }

  if (!isCameraActive) {
    return (
      <div className="camera-placeholder-card">
        <button onClick={startCamera} className="btn btn-success btn-large">🔓 فتح نظام الكاميرا والمعايرة الذكية</button>
      </div>
    );
  }

  return (
    <div className="camera-view-tier">
      <div className="live-camera-card">
        <div className="webcam-viewport-wrapper">
          <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="webcam-render" />

          {isCapturing && currentStage && (
            <div className="visual-stage-instruction-overlay">
              <div className="instruction-badge">{currentStage}</div>
            </div>
          )}

          {countdown > 0 && <div className="visual-countdown-overlay">{countdown}</div>}

          {warningMessage && (
            <div className="realtime-warning-banner">
              {warningMessage}
            </div>
          )}
        </div>

        <div className="camera-controls-status-bar">
          <p className="stage-alert-text">الوضعية الحالية: <span className="stage-highlight-text">{currentStage || "جاهز للبدء"}</span></p>
          <div className="action-buttons-row">
            <button onClick={startCaptureSequence} className="btn btn-primary" disabled={isCapturing}>
              {isCapturing ? "📸 جاري تصوير زوايا الوجه..." : "🎬 ابدأ التقاط الـ 50 إطار"}
            </button>
            <button onClick={() => setIsCameraActive(false)} className="btn btn-secondary" disabled={isCapturing}>إغلاق الكاميرا</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CameraView;