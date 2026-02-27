export interface Society {
  id: string;
  name: string;
  city: string;
  locality: string;
  address: string;
  totalFlats: number;
  isActive: boolean;
}

export interface Flat {
  id: string;
  societyId: string;
  tower: string;
  number: string;
  floor: number;
  isOwnerOccupied: boolean;
}

export interface Resident {
  id: string;
  userId: string;
  flatId: string;
  role: 'owner' | 'tenant' | 'family-member';
  isPrimary: boolean;
}

export interface VisitorLog {
  id: string;
  societyId: string;
  flatId: string;
  name: string;
  mobile: string;
  purpose: string;
  inTime: string;
  outTime?: string;
}

export interface MaintenanceInvoice {
  id: string;
  societyId: string;
  flatId: string;
  month: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
  status: 'pending' | 'paid' | 'overdue';
}

export interface ComplaintTicket {
  id: string;
  societyId: string;
  flatId: string;
  title: string;
  description: string;
  category: 'maintenance' | 'security' | 'billing' | 'other';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
}

export interface Announcement {
  id: string;
  societyId: string;
  title: string;
  message: string;
  createdAt: string;
  createdBy: string;
}

export interface PollOption {
  id: string;
  label: string;
  voteCount: number;
}

export interface SocietyPoll {
  id: string;
  societyId: string;
  question: string;
  options: PollOption[];
  closesAt: string;
}
