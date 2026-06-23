import React, { useState, useRef, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import './App.css';

// استيراد المكونات الفرعية المقسمة
import Header from './components/Header';
import LoginForm from './components/LoginForm';
import DashboardInfo from './components/DashboardInfo';
import CameraView from './components/CameraView';
import ImageGallery from './components/ImageGallery';

// 🌟 1. استيراد ملف data.json المخصص للتحقق من تسجيل الدخول (طلاب ودكاترة)
import { mockUsersDatabase } from './data.json';

// 🌟 2. استيراد ملف students.json المخصص للعرض في لوحة إحصائيات الدكتور
import { mockStudentsDatabase } from './students.json';

const CLOUD_NAME = "dqcv48dd1";
const UPLOAD_PRESET = "new_upload";

function App() {
  // =========================================================================
  // STATE MANAGEMENT
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

  // التحكم في ظهور لوحة التحكم الخاصة بالدكتور (التبويب الجانبي)
  const [showDoctorPanel, setShowDoctorPanel] = useState(false);

  // 🌟 حالات الفلاتر الجديدة للوحة تحكم الدكتور
  const [filterYear, setFilterYear] = useState('All');
  const [filterTrack, setFilterTrack] = useState('All');

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
  // AI MODEL INITIALIZATION
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
  // AUTHENTICATION LOGIC
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
      setLoginNationalId('');
      setLoginPassword('');
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
    setShowDoctorPanel(false);
    setFilterYear('All');
    setFilterTrack('All');
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
  // CAPTURE LOOP WITH CORE STATE MACHINE
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

      while (completedFramesForStage < stage.count) {
        for (let c = 3; c > 0; c--) {
          setCountdown(c);
          const isFacePresent = await checkFaceInFrame();
          if (!isFacePresent) {
            setWarningMessage('⚠️ تنبيه: يرجى توجيه وجهك أمام الكاميرا بوضوح للمتابعة!');
            c = 4;
          } else {
            setWarningMessage('');
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        setCountdown(0);

        let faceInterrupted = false;

        for (let i = completedFramesForStage; i < stage.count; i++) {
          const isFacePresent = await checkFaceInFrame();

          if (!isFacePresent) {
            setWarningMessage('❌ توقف التصوير! يرجى إبقاء وجهك ثابتاً، سيعاد العد التنازلي للاستعداد...');
            failedAttempts++;
            faceInterrupted = true;
            await new Promise(resolve => setTimeout(resolve, 800));
            break;
          }

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
              completedFramesForStage++;
            }
          }
          await new Promise(resolve => setTimeout(resolve, 250));
        }

        if (faceInterrupted) {
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
  // CLOUD SYNCHRONIZATION LOGIC
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

  // =========================================================================
  // FILTER LOGIC FOR DR PANEL
  // =========================================================================
  const filteredStudents = mockStudentsDatabase.filter(student => {
    const matchYear = filterYear === 'All' || student.academicYear === filterYear;
    const matchTrack = filterTrack === 'All' || student.track === filterTrack;
    return matchYear && matchTrack;
  });

  // =========================================================================
  // RENDER INTERFACE
  // =========================================================================
  return (
    <div className="app">
      <div className="container">
        
        <Header />

        {!isLoggedIn ? (
          <LoginForm 
            loginNationalId={loginNationalId}
            setLoginNationalId={setLoginNationalId}
            loginPassword={loginPassword}
            setLoginPassword={setLoginPassword}
            handleLogin={handleLogin}
          />
        ) : (
          <>
            {/* التبويب الجانبي العائم للدكتور */}
            {currentUser?.role === 'doctor' && (
              <div className="doctor-sidebar-tab">
                <button 
                  onClick={() => setShowDoctorPanel(!showDoctorPanel)} 
                  className={`btn-sidebar ${showDoctorPanel ? 'active' : ''}`}
                >
                  {showDoctorPanel ? "📷 العودة لنظام الكاميرا" : "📊 فتح لوحة تحكم الدكتور"}
                </button>
              </div>
            )}

            {showDoctorPanel && currentUser?.role === 'doctor' ? (
              <div className="doctor-custom-dashboard">
                <div className="dashboard-header-row">
                  <h2>📊 لوحة مراقبة وإحصائيات الطلاب</h2>
                  <p>مرحباً د. {firstName} | الطلاب المطابقين للفحص الحالي: <strong>{filteredStudents.length} من {mockStudentsDatabase.length} طالب</strong></p>
                </div>

                {/* 🌟 شريط الفلاتر الجديد */}
                <div className="dashboard-filters-bar">
                  <div className="filter-item">
                    <label>📅 تصفية بالسنة الدراسية:</label>
                    <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                      <option value="All">كل السنوات الدراسية</option>
                      <option value="One">الفرقة الأولى</option>
                      <option value="Two">الفرقة الثانية</option>
                      <option value="Three">الفرقة الثالثة</option>
                      <option value="Four">الفرقة الرابعة</option>
                    </select>
                  </div>

                  <div className="filter-item">
                    <label>🧬 تصفية بالمسار الأكاديمي:</label>
                    <select value={filterTrack} onChange={(e) => setFilterTrack(e.target.value)}>
                      <option value="All">كل المسارات</option>
                      <option value="General">عام (General)</option>
                      <option value="Bio">بايو (Bioinformatics)</option>
                    </select>
                  </div>
                </div>

                {/* جدول استعراض بيانات الطلاب المصفى */}
                <div className="table-responsive-wrapper">
                  <table className="students-stats-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>اسم الطالب</th>
                        <th>الرقم القومي</th>
                        <th>الفرقة الدراسية (الصف)</th>
                        <th>المسار الأكاديمي (الفئة)</th>
                        <th>حالة النظام / الوقت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student, index) => (
                          <tr key={student.nationalId}>
                            <td>{index + 1}</td>
                            <td className="student-name-cell">{`${student.firstName} ${student.secondName} ${student.lastName}`}</td>
                            <td className="national-id-cell">{student.nationalId}</td>
                            <td>
                              <span className={`badge-year ${student.academicYear}`}>
                                {student.academicYear === 'One' ? 'الفرقة الأولى' :
                                 student.academicYear === 'Two' ? 'الفرقة الثانية' :
                                 student.academicYear === 'Three' ? 'الفرقة الثالثة' : 'الفرقة الرابعة'}
                              </span>
                            </td>
                            <td>
                              <span className={`badge-track ${student.track}`}>
                                {student.track === 'Bio' ? '🧬 بايو' : '💻 عام'}
                              </span>
                            </td>
                            <td>
                              <span className="status-timestamp-badge">🕒 تم التحقق</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                            🔍 لا توجد نتائج تطابق خيارات التصفية المحددة!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* الواجهة الطبيعية العادية لجمع العينات */
              <>
                <DashboardInfo 
                  currentUser={currentUser}
                  firstName={firstName}
                  secondName={secondName}
                  lastName={lastName}
                  academicYear={academicYear}
                  track={track}
                  handleLogout={handleLogout}
                />

                <CameraView 
                  modelLoading={modelLoading}
                  isCameraActive={isCameraActive}
                  setIsCameraActive={setIsCameraActive}
                  webcamRef={webcamRef}
                  isCapturing={isCapturing}
                  currentStage={currentStage}
                  countdown={countdown}
                  warningMessage={warningMessage}
                  startCaptureSequence={startCaptureSequence}
                  startCamera={startCamera}
                />

                <ImageGallery 
                  capturedImages={capturedImages}
                  galleryEvaluation={galleryEvaluation}
                  getFullFolderName={getFullFolderName}
                  uploadToCloudinary={uploadToCloudinary}
                  isUploading={isUploading}
                  uploadProgress={uploadProgress}
                  startCaptureSequence={startCaptureSequence}
                />
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
}

export default App;