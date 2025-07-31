import React from 'react';

function Footer() {
  return (
    <div className="py-4 text-center bg-slate-900 text-slate-100">
      &copy; {new Date().getFullYear()} Te Quiero Feliz
    </div>
  );
}

export default Footer;
