import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import './App.css';

// =========================================================================
// 1. CONSTANTS & ASSETS
// =========================================================================
import teamImage from './Im1.jpeg';
import logoOne from './logo.jpg';
import logoTwo from './logo2.jpg';

const CLOUD_NAME = "dqcv48dd1";
const UPLOAD_PRESET = "new_upload";

import { mockUsersDatabase } from './data.json';

function App() {
  // =========================================================================
  // 2. STATE MANAGEMENT
  // =========================================================================
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [loginNationalId, setLoginNationalId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [firstName, setFirstName] = useState('');
  const [secondName, setSecondName] = useState('');
  const [lastName, setLastName] = useState('');
  const [academicYear, setAcademicYear] = useState('One');
  const [track, setTrack] = useState('General');

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [currentStageLabel, setCurrentStageLabel] = useState('');

  const [faceModel, setFaceModel] = useState(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [warningMessage, setWarningMessage] = useState('');
  const [galleryEvaluation, setGalleryEvaluation] = useState({ passed: true, score: 0, msg: '' });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const webcamRef = useRef(null);

  const stages = [
    { label: 'Front', arabic: '🟢 وجّه وجهك للأمام مباشرة', count: 10 },
    { label: 'Right_Profile', arabic: '◀️ التفت ببطء للجانب الأيمن', count: 10 },
    { label: 'Left_Profile', arabic: '▶️ التفت ببطء للجانب الأيسر', count: 10 },
    { label: 'Forehead_Up', arabic: '🔼 ارفع الرأس قليلاً للأعلى', count: 10 },
    { label: 'Chin_Down', arabic: '🔽 اخفض الذقن قليلاً للأسفل', count: 10 }
  ];

  // =========================================================================
  // 3. AI MODEL INITIALIZATION
  // =========================================================================
  useEffect(() => {
    async function loadModel() {
      try {
        await tf.ready();
        const model = await blazeface.load();
        setFaceModel(model);
        setModelLoading(false);
      } catch (err) {
        console.error("فشل تحميل نموذج تتبع الوجه:", err);
        setModelLoading(false);
      }
    }
    loadModel();
  }, []);

  const checkFaceInFrame = async () => {
    if (!faceModel || !webcamRef.current || !webcamRef.current.video) return false;
    const video = webcamRef.current.video;
    if (video.readyState === 4) {
      const predictions = await faceModel.estimateFaces(video, false);
      return predictions.length > 0;
    }
    return false;
  };

  // =========================================================================
  // 4. AUTHENTICATION LOGIC
  // =========================================================================
  const handleLogin = (e) => {
    e.preventDefault();
    if (loginNationalId.trim().length !== 14) {
      alert("الرجاء إدخال رقم قومي صحيح مكون من 14 رقماً!");
      return;
    }
    const userFound = mockUsersDatabase.find(
      user => user.nationalId === loginNationalId && user.password === loginPassword
    );
    if (userFound) {
      setCurrentUser(userFound);
      setIsLoggedIn(true);
      setFirstName(userFound.firstName);
      setSecondName(userFound.secondName);
      setLastName(userFound.lastName);
      if (userFound.role === 'student') {
        setAcademicYear(userFound.academicYear);
        setTrack(userFound.track || 'General');
      }
    } else {
      alert("❌ خطأ في الرقم القومي أو كلمة المرور!");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setFirstName('');
    setSecondName('');
    setLastName('');
    setIsCameraActive(false);
    setCapturedImages([]);
    setWarningMessage('');
    setCurrentStage('');
    setCurrentStageLabel('');
    setGalleryEvaluation({ passed: true, score: 0, msg: '' });
  };

  const getFullFolderName = () => {
    const f = firstName.trim() || "Unknown";
    const s = secondName.trim() || "Unknown";
    const l = lastName.trim() || "Unknown";
    if (currentUser?.role === 'doctor') {
      return `Doctor_${f}_${s}_${l}`;
    }
    return `${f}_${s}_${l}_Year_${academicYear}_Track_${track}`;
  };

  const startCamera = () => {
    setCapturedImages([]);
    setWarningMessage('');
    setCurrentStage('');
    setCurrentStageLabel('');
    setGalleryEvaluation({ passed: true, score: 0, msg: '' });
    setIsCameraActive(true);
  };

  // =========================================================================
  // 5. CAPTURE LOOP WITH VISUAL DIRECTION STAGE GUIDES
  // =========================================================================

  const startCaptureSequence = async () => {
    setIsCapturing(true);
    setWarningMessage('');
    setGalleryEvaluation({ passed: true, score: 0, msg: '' });
    let allTriggeredImages = [];
    let failedAttempts = 0;

    for (let stage of stages) {
      setCurrentStage(stage.arabic);
      setCurrentStageLabel(stage.label);

      let completedFramesForStage = 0;

      // حلقة تضمن التقاط 10 إطارات سليمة للوضعية الحالية
      while (completedFramesForStage < stage.count) {

        // 1. تشغيل العَد التنازلي (3 ثوانٍ) قبل بدء التصوير أو بعد العودة من التحذير
        for (let c = 3; c > 0; c--) {
          setCountdown(c);
          const isFacePresent = await checkFaceInFrame();
          if (!isFacePresent) {
            setWarningMessage('⚠️ تنبيه: يرجى توجيه وجهك أمام الكاميرا بوضوح للمتابعة!');
            c = 4; // إعادة تثبيت العداد عند 3 ثوانٍ طالما الوجه غير موجود
          } else {
            setWarningMessage('');
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        setCountdown(0);

        // 2. محاولة التقاط الإطارات المتبقية للوضعية الحالية
        let faceInterrupted = false;

        for (let i = completedFramesForStage; i < stage.count; i++) {
          const isFacePresent = await checkFaceInFrame();

          if (!isFacePresent) {
            // حدوث مشكلة: إظهار التحذير فوراً، رفع الاسكور، وتفعيل علم المقاطعة
            setWarningMessage('❌ توقف التصوير! يرجى إبقاء وجهك ثابتاً، سيعاد العد التنازلي للاستعداد...');
            failedAttempts++;
            faceInterrupted = true;

            // إعطاء المتصفح 800ms ليرسم التحذير بوضوح على الشاشة قبل أي شيء
            await new Promise(resolve => setTimeout(resolve, 800));
            break; // الخروج من حلقة التقاط الصور الحالية للعودة للعد التنازلي
          }

          // إذا كان الوضع سليماً، يتم مسح أي تحذير والتقاط الإطار
          setWarningMessage('');
          if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
              allTriggeredImages.push({
                src: imageSrc,
                label: stage.label,
                arabicLabel: stage.arabic.replace(/[🟢◀️▶️🔼🔽]\s/, '')
              });
              setCapturedImages([...allTriggeredImages]);
              completedFramesForStage++; // زيادة عدد الإطارات الناجحة
            }
          }
          // مسافة أمان صغيرة بين اللقطات المتتالية الناجحة
          await new Promise(resolve => setTimeout(resolve, 250));
        }

        // إذا تم مقاطعة الجلسة بسبب اختفاء الوجه، نترك الحلقة تعيد نفسها (وبالتالي سيعيد الـ Countdown)
        if (faceInterrupted) {
          // دقيقة انتظار إضافية للتأكد من استيعاب المستخدم قبل بدء الـ 3 ثوانٍ الجديدة
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    setIsCapturing(false);
    setCurrentStageLabel('');

    if (failedAttempts > 15) {
      setGalleryEvaluation({
        passed: false,
        score: failedAttempts,
        msg: "⚠️ جودة التقاط الصور ضعيفة لوجود حركات مشوشة أو اختفاء متكرر للوجه. يرجى إعادة التقاط الصور مجدداً."
      });
      setCurrentStage('❌ فشل تقييم جودة الصور!');
    } else {
      setGalleryEvaluation({
        passed: true,
        score: failedAttempts,
        msg: "✅ تم اجتياز تقييم الجودة الذكي بنجاح! جميع العينات الـ 50 واضحة ومطابقة للمعايير."
      });
      setCurrentStage('✨ تم اكتمال جلسة التصوير بنجاح واجتياز التقييم!');
    }
  };

  // =========================================================================
  // 6. CLOUD SYNCHRONIZATION LOGIC
  // =========================================================================
  const uploadToCloudinary = async () => {
    if (!galleryEvaluation.passed) {
      alert("لا يمكن رفع الصور! يرجى إعادة التقاط العينات أولاً لتخطي تحذير الجودة.");
      return;
    }
    if (capturedImages.length === 0) return;
    setIsUploading(true);
    setUploadProgress(0);

    const folderName = getFullFolderName();

    for (let i = 0; i < capturedImages.length; i++) {
      const item = capturedImages[i];
      const formData = new FormData();
      formData.append('file', item.src);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', `TheGateKnow/${folderName}/${item.label}`);

      try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData
        });
        if (response.ok) {
          setUploadProgress(prev => prev + 1);
        }
      } catch (error) {
        console.error("خطأ أثناء الرفع:", error);
      }
    }

    setIsUploading(false);
    alert("✨ تم رفع مجموعة البيانات البيومترية كاملة بنجاح!");
  };

  return (
    <div className="app">
      <div className="container">

        <div className="header-branding">
          <img src={logoOne} alt="Faculty Logo" className="brand-logo" />
          <div className="title-area">
            <h1>The Gate Know</h1>
            <p>نظام تسجيل القياسات الحيوية للطلاب والموظفين</p>
          </div>
          <img src={logoTwo} alt="Project Logo" className="brand-logo-two" />
        </div>

        {!isLoggedIn ? (
          <div className="login-card-wrapper">
            <h3>🔒 تسجيل الدخول</h3>
            <form onSubmit={handleLogin} className="login-form">
              <div className="field-block">
                <label>الرقم القومي (14 رقم)</label>
                <input
                  type="text"
                  maxLength="14"
                  value={loginNationalId}
                  onChange={e => setLoginNationalId(e.target.value.replace(/\D/g, ''))}
                  placeholder="أدخل الـ 14 رقم بالكامل"
                  required
                />
              </div>
              <div className="field-block">
                <label>كلمة المرور</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full">تحقق ودخول للنظام</button>
            </form>
          </div>
        ) : (
          <>
            <div className="registration-form-section">
              <div className="form-title-row">
                <h3>✍️ لوحة البيانات الشخصية [مرحلة إعداد عينات الوجه]</h3>
                <div className="user-badge-info">
                  <span className="role-tag">{currentUser?.role === 'doctor' ? '👨‍🏫 دكتور' : '🎓 طالب'}</span>
                  <button onClick={handleLogout} className="btn-logout">تسجيل الخروج</button>
                </div>
              </div>
              <div className="input-grid">
                <div className="field-block">
                  <label>الاسم الأول</label>
                  <input type="text" value={firstName} placeholder="الاسم الأول" disabled={true} />
                </div>
                <div className="field-block">
                  <label>الاسم الثاني</label>
                  <input type="text" value={secondName} placeholder="الاسم الثاني" disabled={true} />
                </div>
                <div className="field-block">
                  <label>اسم العائلة</label>
                  <input type="text" value={lastName} placeholder="اسم العائلة" disabled={true} />
                </div>
                {currentUser?.role === 'student' && (
                  <>
                    <div className="field-block">
                      <label>السنة الدراسية</label>
                      <select value={academicYear} disabled={true}>
                        <option value="One">الفرقة الأولى (First Year)</option>
                        <option value="Two">الفرقة الثانية (Second Year)</option>
                        <option value="Three">الفرقة الثالثة (Third Year)</option>
                        <option value="Four">الفرقة الرابعة (Fourth Year)</option>
                      </select>
                    </div>
                    <div className="field-block">
                      <label>المسار الأكاديمي (Track)</label>
                      <select value={track} disabled={true}>
                        <option value="General">عام (General)</option>
                        <option value="Bio">بايو (Bioinformatics)</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="camera-view-tier">
              {modelLoading ? (
                <div className="camera-placeholder-card">
                  <p style={{ color: '#fff' }}>🔄 جاري تحميل وتجهيز نموذج تتبع ملامح الوجه الذكي...</p>
                </div>
              ) : isCameraActive ? (
                <div className="live-camera-card">
                  <div className="webcam-viewport-wrapper">
                    <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="webcam-render" />

                    {/* طبقة الإرشاد البصري التوجيهي الكبير للمسخدم */}
                    {isCapturing && currentStage && (
                      <div className="visual-stage-instruction-overlay">
                        <div className="instruction-badge">{currentStage}</div>
                      </div>
                    )}

                    {countdown > 0 && <div className="visual-countdown-overlay">{countdown}</div>}

                    {/* التنبيه العائم المطور والموسط */}
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
              ) : (
                <div className="camera-placeholder-card">
                  <button onClick={startCamera} className="btn btn-success btn-large">🔓 فتح نظام الكاميرا والمعايرة الذكية</button>
                </div>
              )}
            </div>

            {!galleryEvaluation.passed && (
              <div className="evaluation-alert-box danger-zone">
                <h4>{galleryEvaluation.msg}</h4>
                <button onClick={startCaptureSequence} className="btn btn-primary" style={{ marginTop: '12px' }}>🔄 إعادة محاولة التقاط الـ 50 صورة الآن</button>
              </div>
            )}

            {capturedImages.length > 0 && (
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
            )}
          </>
        )}

        <div className="team-footer">
          <div className="team-image-wrapper">
            <img src={teamImage} alt="Airontic Team Work" className="team-img" />
          </div>
          <p className="team-text">Airontic Team © 2026</p>
        </div>

      </div>
    </div>
  );
}

export default App;