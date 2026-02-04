import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Check, X, AlertTriangle, Info, Zap } from 'lucide-react';

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

    const getToastIcon = (type: ToastVariant) => {
      switch (type) {
        case 'success':
          return Check;
        case 'error':
          return X;
        case 'warning':
          return AlertTriangle;
        case 'reward':
          return Zap;
        default:
          return Info;
      }
    };

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
    const Icon = getToastIcon(type);
    const color = getToastColor(type);

    return (
      <div className="fixed left-1/2 top-[calc(var(--titlebar-height)+1px)] z-50 w-[360px] max-w-[90vw] -translate-x-1/2">
        <div
          className={`border rounded-lg p-2 transition-all hover-lift group relative overflow-hidden ${
            isDark ? 'bg-industrial-black-secondary border-industrial-border' : 'bg-white border-gray-300'
          }`}
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l" style={{ backgroundColor: color }} />
          <div className="flex items-start gap-4 ml-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border"
              style={{ backgroundColor: `${color}1A`, borderColor: `${color}33` }}
            >
              <Icon className="w-5 h-5" strokeWidth={1.5} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-[13px] font-mono font-semibold mb-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {toast.title}
              </h3>
              <p className={`text-[11px] font-mono leading-snug ${isDark ? 'text-industrial-white-secondary' : 'text-gray-600'}`}>
                {toast.message}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

export default EditorSubmitToast;
