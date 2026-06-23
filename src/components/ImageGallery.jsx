import React from 'react';

function ImageGallery({ 
  capturedImages, 
  galleryEvaluation, 
  getFullFolderName, 
  uploadToCloudinary, 
  isUploading, 
  uploadProgress,
  startCaptureSequence
}) {
  if (capturedImages.length === 0) return null;

  return (
    <>
      {!galleryEvaluation.passed && (
        <div className="evaluation-alert-box danger-zone">
          <h4>{galleryEvaluation.msg}</h4>
          <button onClick={startCaptureSequence} className="btn btn-primary" style={{ marginTop: '12px' }}>🔄 إعادة محاولة التقاط الـ 50 صورة الآن</button>
        </div>
      )}

      <div className="gallery-section">
        <div className="gallery-header">
          <div>
            <h3>📦 عينات المجلد المستهدف: <span className="folder-highlight">{getFullFolderName()}</span></h3>
            <p>إجمالي الصور الملتقطة حتى الآن: <strong style={{ color: '#a855f7' }}>{capturedImages.length} / 50</strong> صُورة</p>
            {galleryEvaluation.passed && <p className="evaluation-success-text">{galleryEvaluation.msg}</p>}
          </div>
          <button onClick={uploadToCloudinary} className="btn btn-cloud-upload" disabled={isUploading || !galleryEvaluation.passed}>
            {isUploading ? `🔄 جاري الرفع للسحابة (${uploadProgress}/50)...` : "☁️ رَفْع البيانات المستخرجة للسحابة"}
          </button>
        </div>

        <div className="gallery-container-scroll">
          <div className="gallery-grid-fixed">
            {capturedImages.map((img, index) => (
              <div key={index} className="enhanced-gallery-item">
                <div className="img-frame">
                  <img src={img.src} alt={`captured-idx-${index}`} />
                </div>
                <span className="gallery-tag-fixed">{img.arabicLabel} ({index + 1})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default ImageGallery;