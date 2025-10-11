'use client';

import { useAuthContext } from '@/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback } from '../ui/avatar';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function AuthButtons() {
  const { currentUser, logout } = useAuthContext();
  const router = useRouter();
  const isAdmin =
    currentUser?.role === 'admin' || currentUser?.role === 'manager';
  return (
    <div>
      <div>
        {currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Avatar>
                {!!currentUser.avatar && (
                  <Image
                    src={currentUser.avatar || ''}
                    alt={`${currentUser.name} avatar`}
                    width={70}
                    height={70}
                  />
                )}
                <AvatarFallback className="text-sky-950">
                  {(currentUser.name || currentUser.email)?.[0]}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>
                <div>{currentUser.name}</div>
                <div className="font-normal text-xs">{currentUser.email}</div>
                <div className=" text-xs italic font-semibold uppercase">
                  {currentUser?.role?.toLowerCase()}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={isAdmin ? '/admin-dashboard' : '/user-dashboard'}>
                  Dashboard
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={async () => {
                  await logout();
                  router.refresh();
                }}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!currentUser && (
          <div className="flex gap-2 items-center">
            <Link
              href="/login"
              className="uppercase tracking-widest hover:underline"
            >
              Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthButtons;
