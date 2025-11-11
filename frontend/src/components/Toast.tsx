import { useEffect } from 'react';

interface ToastProps {
   message: string;
   onClose: () => void;
   duration?: number;
}

export const Toast = ({ message, onClose, duration = 2000 }: ToastProps) => {
   useEffect(() => {
      const timer = setTimeout(() => {
         onClose();
      }, duration);

      return () => clearTimeout(timer);
   }, [duration, onClose]);

   return (
      <div className="fixed bottom-8 right-8 z-50 animate-slide-up">
         <div className="bg-pink text-white px-6 py-3 rounded-full shadow-lg shadow-pink/50">
            <p className="text-sm">{message}</p>
         </div>
      </div>
   );
};
