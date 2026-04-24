import type { ReactNode } from "react";

interface ModalCardProps {
  title: string;
  onBack: () => void;
  children: ReactNode;
}

export const ModalCard = ({ title, onBack, children }: ModalCardProps) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-black border-2 border-pink rounded-3xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-gray pb-4">
          <button
            onClick={onBack}
            className="text-white hover:text-pink transition-colors text-lg leading-none"
          >
            ←
          </button>
          <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
};
