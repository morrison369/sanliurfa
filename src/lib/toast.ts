// Toast notification system

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

class ToastManager {
  private container: HTMLElement | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof document === 'undefined') return;

    // Create container if it doesn't exist
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
      document.body.appendChild(this.container);
    }
  }

  show(options: ToastOptions) {
    const { 
      message, 
      type = 'info', 
      duration = 3000,
      position = 'top-right'
    } = options;

    if (!this.container) {
      this.init();
    }

    if (!this.container) return;

    // Update position
    this.updatePosition(position);

    // Create toast element
    const toast = document.createElement('div');
    toast.className = this.getToastClasses(type);
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        ${this.getIcon(type)}
        <p class="text-sm font-medium">${message}</p>
        <button class="ml-2 text-current opacity-60 hover:opacity-100" aria-label="Kapat">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;

    // Add close button functionality
    const closeBtn = toast.querySelector('button');
    closeBtn?.addEventListener('click', () => {
      this.remove(toast);
    });

    // Add to container
    this.container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('translate-x-0', 'opacity-100');
      toast.classList.remove('translate-x-full', 'opacity-0');
    });

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.remove(toast);
      }, duration);
    }

    return toast;
  }

  private remove(toast: HTMLElement) {
    toast.classList.add('translate-x-full', 'opacity-0');
    toast.classList.remove('translate-x-0', 'opacity-100');
    
    setTimeout(() => {
      toast.remove();
    }, 300);
  }

  private updatePosition(position: string) {
    if (!this.container) return;

    const positions: Record<string, string> = {
      'top-right': 'fixed top-4 right-4 z-50 flex flex-col gap-2',
      'top-left': 'fixed top-4 left-4 z-50 flex flex-col gap-2',
      'bottom-right': 'fixed bottom-4 right-4 z-50 flex flex-col gap-2',
      'bottom-left': 'fixed bottom-4 left-4 z-50 flex flex-col gap-2',
      'top-center': 'fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2',
      'bottom-center': 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2',
    };

    this.container.className = positions[position] || positions['top-right'];
  }

  private getToastClasses(type: ToastType): string {
    const baseClasses = 'transform transition-all duration-300 translate-x-full opacity-0 pointer-events-auto';
    
    const typeClasses: Record<ToastType, string> = {
      success: 'bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg min-w-[300px]',
      error: 'bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg min-w-[300px]',
      warning: 'bg-yellow-500 text-white px-4 py-3 rounded-lg shadow-lg min-w-[300px]',
      info: 'bg-blue-500 text-white px-4 py-3 rounded-lg shadow-lg min-w-[300px]',
    };

    return `${baseClasses} ${typeClasses[type]}`;
  }

  private getIcon(type: ToastType): string {
    const icons: Record<ToastType, string> = {
      success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
      error: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
      warning: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
      info: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    };

    return icons[type];
  }

  // Convenience methods
  success(message: string, duration?: number) {
    return this.show({ message, type: 'success', duration });
  }

  error(message: string, duration?: number) {
    return this.show({ message, type: 'error', duration });
  }

  warning(message: string, duration?: number) {
    return this.show({ message, type: 'warning', duration });
  }

  info(message: string, duration?: number) {
    return this.show({ message, type: 'info', duration });
  }
}

// Create singleton instance
export const toast = new ToastManager();

// Make available globally for inline scripts
declare global {
  interface Window {
    toast: ToastManager;
  }
}

if (typeof window !== 'undefined') {
  window.toast = toast;
}
