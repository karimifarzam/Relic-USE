import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { WindowProvider } from '../contexts/WindowContext';

interface ChildWindowProps {
  children: React.ReactNode;
  title?: string;
  width?: number;
  height?: number;
  onClose?: () => void;
}

function ChildWindow({
  children,
  title = 'New Window',
  width = 800,
  height = 600,
  onClose,
}: ChildWindowProps) {
  const [childWindow, setChildWindow] = useState<Window | null>(null);
  const [rootElement, setRootElement] = useState<HTMLElement | null>(null);

  // Memoize handleClose to prevent recreating on each render
  const handleClose = useCallback(() => {
    // Clean up any resize observers before closing
    if (childWindow) {
      const observers = (childWindow as any).__resizeObservers || [];
      observers.forEach((observer: ResizeObserver) => {
        try {
          observer.disconnect();
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
    }
    onClose?.();
  }, [onClose, childWindow]);

  useEffect(() => {
    // Open new window
    const screenWidth = window.screen.availWidth;
    const screenHeight = window.screen.availHeight;
    const left = Math.max(0, Math.floor((screenWidth - width) / 2));
    const top = Math.max(0, Math.floor((screenHeight - height) / 2));
    const win = window.open(
      '',
      '',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes,frame=yes,titlebar=yes`,
    );

    if (!win) return;

    // Initialize resize observers array
    (win as any).__resizeObservers = [];

    // Properly type and override ResizeObserver
    const OriginalResizeObserver = (win as unknown as typeof globalThis).ResizeObserver;
    (win as any).ResizeObserver = class extends OriginalResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        super(callback);
        (win as any).__resizeObservers.push(this);
      }
    };

    // Set title
    win.document.title = title;

    // Get the main window's styles once
    const mainStyles = Array.from(document.styleSheets)
      .map((styleSheet) => {
        try {
          return Array.from(styleSheet.cssRules)
            .map((rule) => rule.cssText)
            .join('\n');
        } catch (e) {
          console.warn('Could not access styleSheet', e);
          return '';
        }
      })
      .join('\n');

    // Create style element once
    const style = win.document.createElement('style');
    style.textContent = `
      ${mainStyles}
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
        background: white;
      }
      #root {
        min-height: 100vh;
      }
    `;
    win.document.head.appendChild(style);

    // Create root element if it doesn't exist
    let root = win.document.getElementById('root');
    if (!root) {
      root = win.document.createElement('div');
      root.id = 'root';
      win.document.body.appendChild(root);
    }

    win.addEventListener('beforeunload', handleClose);
    setChildWindow(win);
    setRootElement(root);

    return () => {
      // Clean up
      if (win) {
        win.removeEventListener('beforeunload', handleClose);
        const observers = (win as any).__resizeObservers || [];
        observers.forEach((observer: ResizeObserver) => {
          try {
            observer.disconnect();
          } catch (e) {
            // Ignore errors during cleanup
          }
        });
        win.close();
      }
    };
  }, []);

  if (!childWindow || !rootElement) return null;

  return createPortal(
    <WindowProvider windowRef={childWindow}>
      <div className="min-h-screen bg-white">{children}</div>
    </WindowProvider>,
    rootElement,
  );
}

export default ChildWindow;
