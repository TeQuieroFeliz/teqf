export type StatusType = 'pending' | 'approved' | 'rejected';
export type RoleType = 'client' | 'manager' | 'admin';
export type UserType = {
  id: string;
  avatar?: string;
  createdAt: any;
  email: string;
  name: string;
  role: RoleType;
  status: StatusType;
};

export type EventsType = { id: string; title: string; userId: string };
