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
  const auth = useAuthContext();
  const router = useRouter();
  const isAdmin = auth.customClaims?.role === 'ADMIN';

  return (
    <div>
      <div>
        {!!auth?.currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Avatar>
                {!!auth.currentUser.photoURL && (
                  <Image
                    src={auth.currentUser.photoURL || ''}
                    alt={`${auth.currentUser.displayName} avatar`}
                    width={70}
                    height={70}
                  />
                )}
                <AvatarFallback className="text-sky-950">
                  {
                    (auth.currentUser.displayName ||
                      auth.currentUser.email)?.[0]
                  }
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>
                <div>{auth.currentUser.displayName}</div>
                <div className="font-normal text-xs">
                  {auth.currentUser.email}
                </div>
                <div className=" text-xs italic font-semibold">
                  {auth.customClaims?.role}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin ? (
                <DropdownMenuItem asChild>
                  <Link href="/admin-dashboard">Admin Dashboard</Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href="/user-dashboard">Dashboard</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={async () => {
                  await auth.logout();
                  router.refresh();
                }}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!auth?.currentUser && (
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
