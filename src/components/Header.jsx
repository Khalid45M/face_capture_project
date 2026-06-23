import React from 'react';
import logoOne from '../logo.jpg';
import logoTwo from '../logo2.jpg';

function Header() {
  return (
    <div className="header-branding">
      <img src={logoOne} alt="Faculty Logo" className="brand-logo" />
      <div className="title-area">
        <h1>The Gate Know</h1>
        <p>نظام تسجيل القياسات الحيوية للطلاب والموظفين</p>
      </div>
      <img src={logoTwo} alt="Project Logo" className="brand-logo-two" />
    </div>
  );
}

export default Header;