'use client';
import { RoleType, StatusType, UserType } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateUser } from '@/actions/user/updateUser';
import { useAuthContext } from '@/context/AuthContext';
import { requireRole } from '@/lib/utils';
import { toast } from 'sonner';
import DeleteUserDialog from './DeleteUserDialog';

type Props = {
  user: UserType;
  index: number;
};
function UserTableItem({ user, index }: Props) {
  const { currentUser } = useAuthContext();
  const handleStatusChange = async (statusValue: StatusType) => {
    if (!currentUser?.id) {
      toast.error('User not found');
      return;
    }
    const { error, message } = await requireRole(currentUser.id, ['admin']);

    if (error) {
      toast.error(message);
      return;
    }
    await updateUser({ userId: user.id, updatedData: { status: statusValue } });
  };

  const handleRoleChange = async (roleValue: RoleType) => {
    if (!currentUser?.id) {
      toast.error('User not found');
      return;
    }
    const { error, message } = await requireRole(currentUser.id, ['admin']);

    if (error) {
      toast.error(message);
      return;
    }
    await updateUser({ userId: user.id, updatedData: { role: roleValue } });
  };

  return (
    <tr key={user.id} className="border-t">
      <td className="p-3">{index + 1}</td>
      <td className="p-3">{user.name}</td>
      <td className="p-3">{user.email}</td>
      <td className="p-3">
        <Select
          onValueChange={handleStatusChange}
          defaultValue={user.status ?? 'pending'}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectGroup>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approve</SelectItem>
              <SelectItem value="rejected">Reject</SelectItem>
            </SelectContent>
          </SelectGroup>
        </Select>
      </td>
      <td className="p-3">
        <Select
          onValueChange={handleRoleChange}
          defaultValue={user.role ?? 'client'}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectGroup>
            <SelectContent>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="client">Client</SelectItem>
            </SelectContent>
          </SelectGroup>
        </Select>
      </td>
      <td className="p-3">
        <DeleteUserDialog userId={user.id} />
      </td>
    </tr>
  );
}

export default UserTableItem;
