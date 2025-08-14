'use client';
import { Flower } from 'lucide-react';
import AuthButtons from '../auth/AuthButtons';
import Link from 'next/link';
import Image from 'next/image';

function Navbar() {
  return (
    <div className="px-4 py-2 fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-slate-800/90 backdrop-blur-md text-slate-100">
      <Link
        href="/"
        className="font-semibold text-xl md:text-2xl flex items-center justify-center gap-x-1"
      >
        <Image
          src="/logo.png"
          height={70}
          width={70}
          alt=""
          className="object-cover"
        />
        Te Quiero Feliz
      </Link>

      <AuthButtons />
    </div>
  );
}

export default Navbar;
