import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex relative">
      <AdminSidebar />
      <main className="flex-1 p-2.5 md:p-4 bg-slate-50 min-h-[81.5vh]">
        {children}
      </main>
    </div>
  );
}
