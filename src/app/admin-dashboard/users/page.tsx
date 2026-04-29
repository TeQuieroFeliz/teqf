import { getUserWithoutAdmin } from '@/actions/user/getUserWithoutAdmin';
import UsersTable from '@/components/admin/users/UsersTable';

async function UserPage() {
  const data = await getUserWithoutAdmin();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      <UsersTable userData={data} />
    </div>
  );
}

export default UserPage;

export const dynamic = 'force-dynamic';
