'use client';

import { UserType } from '@/lib/types';
import UserTableItem from './UserTableItem';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

type Props = {
  userData: UserType[];
};
export default function UsersTable({ userData }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = userData.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    const nameLower = user.name.toLowerCase();
    const emailLower = user.email.toLowerCase();

    return nameLower.includes(searchLower) || emailLower.includes(searchLower);
  });

  return (
    <>
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Filter users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <ScrollArea className="border rounded-md w-[300px] sm:w-[350px] md:w-full">
        <table className="w-full text-left">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="p-3">S.No</th>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Status</th>
              <th className="p-3">Role</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user, index) => (
                <UserTableItem key={user.id} user={user} index={index} />
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-6 text-center">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
    </>
  );
}
