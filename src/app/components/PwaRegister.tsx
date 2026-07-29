'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Automatically unregister any stale service workers in development mode
      // to prevent chunk-caching loops and infinite page refreshes.
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          let didUnregister = false;
          for (const registration of registrations) {
            registration.unregister();
            didUnregister = true;
          }
          if (didUnregister) {
            console.log('Stale dev service worker unregistered. Clearing caches...');
            caches.keys().then((names) => {
              for (const name of names) {
                caches.delete(name);
              }
            });
            // Force a clean reload to resume normal development HMR
            window.location.reload();
          }
        });
      }
      return;
    }

    // Register PWA service worker in production only
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
        },
        (error) => {
          console.error('Service Worker registration failed:', error);
        }
      );
    }
  }, []);

  return null;
}
