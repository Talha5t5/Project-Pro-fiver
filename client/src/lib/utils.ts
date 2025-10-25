import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getJobTypeColor(type: string): string {
  switch (type) {
    case 'repair':
      return 'blue';
    case 'installation':
      return 'yellow';
    case 'maintenance':
      return 'green';
    case 'quote':
      return 'purple';
    case 'emergency':
      return 'red';
    default:
      return 'gray';
  }
}

export function getJobStatusColor(status: string): string {
  switch (status) {
    case 'scheduled':
      return 'yellow';
    case 'in_progress':
      return 'blue';
    case 'completed':
      return 'green';
    case 'cancelled':
      return 'red';
    default:
      return 'gray';
  }
}

export function calculateJobTotalPrice(hourlyRate: number, duration: number, materialsCost: number): number {
  return hourlyRate * duration + materialsCost;
}
