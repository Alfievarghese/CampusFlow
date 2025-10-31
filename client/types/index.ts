// CampusFlow shared TypeScript types

export type UserRole = 'ADMIN' | 'SUPER_ADMIN';
export type EventStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'CONFLICT_REQUESTED';
export type InviteType = 'PUBLIC' | 'INVITE_ONLY';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isApproved: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Hall {
  id: string;
  name: string;
  capacity: number;
  location: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: EventStatus;
  category: string;
  inviteType: InviteType;
  expectedAttendance: number;
  posterUrl?: string;
  hall: Hall;
  creator: { id: string; name: string; email: string };
  _count: { rsvps: number };
  createdAt: string;
}

export const EVENT_CATEGORIES = ['Academic','Cultural','Sports','Technical','Workshop','Social','Other'] as const;
export type EventCategory = typeof EVENT_CATEGORIES[number];

export interface SystemSettings {
  id: string;
  registrationEnabled: boolean;
  maxAdmins: number;
  updatedAt: string;
}


export interface RSVP {
  id: string;
  eventId: string;
  userIdentifier: string;
  userName: string;
  status: 'INTERESTED' | 'GOING';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  targetId?: string;
  details?: string;
  timestamp: string;
  user?: { name: string; email: string };
}
