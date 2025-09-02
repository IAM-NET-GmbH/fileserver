import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistance, isValid, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

// Tailwind CSS class merging utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// File size formatting
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Date formatting utilities
export function formatDate(date: Date | string | number): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  
  if (!isValid(dateObj)) {
    return 'Ungültiges Datum';
  }
  
  return format(dateObj, 'dd.MM.yyyy HH:mm', { locale: de });
}

export function formatDateShort(date: Date | string | number): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  
  if (!isValid(dateObj)) {
    return 'Ungültig';
  }
  
  return format(dateObj, 'dd.MM.yy', { locale: de });
}

export function formatRelativeTime(date: Date | string | number): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  
  if (!isValid(dateObj)) {
    return 'Ungültiges Datum';
  }
  
  return formatDistance(dateObj, new Date(), { 
    addSuffix: true, 
    locale: de 
  });
}

// Status formatting
export function formatProviderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    active: 'Aktiv',
    error: 'Fehler',
    disabled: 'Deaktiviert',
    checking: 'Überprüft'
  };
  
  return statusMap[status] || status;
}

export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    active: 'text-green-600 bg-green-50 border-green-200',
    error: 'text-red-600 bg-red-50 border-red-200',
    disabled: 'text-gray-600 bg-gray-50 border-gray-200',
    checking: 'text-yellow-600 bg-yellow-50 border-yellow-200'
  };
  
  return colorMap[status] || 'text-gray-600 bg-gray-50 border-gray-200';
}

export function getStatusIcon(status: string): string {
  const iconMap: Record<string, string> = {
    active: 'CheckCircle',
    error: 'XCircle',
    disabled: 'MinusCircle',
    checking: 'Clock'
  };
  
  return iconMap[status] || 'QuestionMarkCircle';
}

// URL utilities
export function buildDownloadUrl(id: string): string {
  return `/api/downloads/${id}/download`;
}

// Validation utilities
export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// String utilities
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
}

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
}

export function extractFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

// Number utilities
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('de-DE').format(num);
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(1)}%`;
}

// Object utilities
export function isEmpty(obj: any): boolean {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  return Object.keys(obj).length === 0;
}

export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

// Array utilities
export function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce((result, item) => {
    const key = keyFn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

export function sortBy<T>(array: T[], keyFn: (item: T) => any, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aValue = keyFn(a);
    const bValue = keyFn(b);
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
}

// Local storage utilities
export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage:`, error);
    return defaultValue;
  }
}

export function setToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage:`, error);
  }
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from localStorage:`, error);
  }
}

// Theme utilities
export function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'absolute';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
