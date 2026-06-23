import React from 'react';

function DashboardInfo({ currentUser, firstName, secondName, lastName, academicYear, track, handleLogout }) {
  const isDoctor = currentUser?.role === 'doctor';

  return (
    <div className="registration-form-section">
      <div className="form-title-row">
        <h3>✍️ لوحة البيانات الشخصية [مرحلة إعداد عينات الوجه]</h3>
        <div className="user-badge-info">
          <span className="role-tag">{isDoctor ? '👨‍🏫 دكتور' : '🎓 طالب'}</span>
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

        {/* تظهر هذه الحقول فقط إذا كان المستخدم طالباً */}
        {!isDoctor && (
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
  );
}

export default DashboardInfo;