import React from 'react';

function LoginForm({ loginNationalId, setLoginNationalId, loginPassword, setLoginPassword, handleLogin }) {
  return (
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
  );
}

export default LoginForm;