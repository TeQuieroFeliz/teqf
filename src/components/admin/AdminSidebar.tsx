'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { name: 'Dashboard', href: '/admin-dashboard' },
  { name: 'Category', href: '/admin-dashboard/category' },
  { name: 'Products', href: '/admin-dashboard/products' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <div className="space-y-2 p-4 lg:p-0">
      {navItems.map(({ name, href }) => (
        <Link
          key={href}
          href={href}
          className={`block px-4 py-2 rounded hover:bg-muted ${
            pathname === href ? 'bg-muted font-semibold' : ''
          }`}
          onClick={onClick}
        >
          {name}
        </Link>
      ))}
    </div>
  );

  return (
    <div>
      {/* Mobile Top Bar */}
      <div className="lg:hidden p-2 w-10">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button>
              <Menu className="w-6 h-6 fixed top-[93px] left-2" />
            </button>
          </SheetTrigger>
          <SheetContent
            aria-describedby={undefined}
            side="left"
            className="w-64"
          >
            <SheetTitle className="text-xl font-bold px-4 pt-3">
              Admin Menu
            </SheetTitle>
            <NavLinks onClick={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block lg:w-64 relative bg-white border-r min-h-screen ">
        <div className="p-4 fixed top-[86px] left-0 h-fit w-64">
          <h2 className="text-xl font-bold mb-4">Admin Menu</h2>
          <NavLinks />
        </div>
      </aside>
    </div>
  );
}
