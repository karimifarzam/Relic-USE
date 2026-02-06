import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

type ToastVariant = 'info' | 'success' | 'warning' | 'error' | 'reward';

type ToastPayload = {
  title: string;
  message: string;
  type?: ToastVariant;
};

export type EditorSubmitToastHandle = {
  show: (toast: ToastPayload) => void;
};

const EditorSubmitToast = React.forwardRef<EditorSubmitToastHandle, { isDark: boolean }>(
  function EditorSubmitToast({ isDark }, ref) {
    const [toast, setToast] = useState<ToastPayload | null>(null);
    const timeoutRef = useRef<number | null>(null);

    const getToastColor = (type: ToastVariant): string => {
      switch (type) {
        case 'success':
          return '#34c759';
        case 'error':
          return '#ff3b30';
        case 'warning':
          return '#ffcc00';
        case 'reward':
          return '#ff9500';
        default:
          return '#007aff';
      }
    };

    const show = useCallback((nextToast: ToastPayload) => {
      setToast(nextToast);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setToast(null);
      }, 4000);
    }, []);

    useImperativeHandle(ref, () => ({ show }), [show]);

    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    if (!toast) return null;
    const type = toast.type ?? 'success';
    const color = getToastColor(type);

    return (
      <div className="fixed left-1/2 top-[calc(var(--titlebar-height)+28.5px)] z-40 w-[360px] max-w-[90vw] -translate-x-1/2 pointer-events-none">
        <div
          className={`border rounded-lg p-2 relative overflow-hidden ${
            isDark ? 'bg-industrial-black-secondary border-industrial-border' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{ backgroundColor: color }}
          />
          <p
            className={`ml-3 text-[11px] font-mono leading-snug ${
              isDark ? 'text-industrial-white-secondary' : 'text-gray-600'
            }`}
          >
            <span
              className={`font-semibold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              {toast.title}
            </span>
            {toast.title ? ': ' : ''}
            {toast.message}
          </p>
        </div>
      </div>
    );
  },
);

export default EditorSubmitToast;
