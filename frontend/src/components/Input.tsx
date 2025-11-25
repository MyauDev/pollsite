import React from 'react';

export interface CustomInputProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
  
  hasIcon?: boolean; 
  icon?: React.ReactNode; 
  onIconClick?: () => void;
  className?: string; 
}

export const Input = ({ id, label, type = 'text', value, onChange, placeholder, hasIcon = false, icon, onIconClick, className, ...props }: CustomInputProps) => {

   const baseStyles = `appearance-none block w-full px-5 py-3 border border-white/50 bg-black text-white placeholder-gray rounded-3xl transition-all duration-300
                      focus:outline-none focus:ring-1 focus:ring-pink focus:border-pink sm:text-base`;

   return (
      <div className="relative">
         <label htmlFor={id} className="sr-only">
            {label}
         </label>
         <input
            id={id}
            name={id}
            type={type}
            required
            className={`${baseStyles} ${hasIcon ? "pr-10" : ""} ${className || ''}`}
            placeholder={placeholder}
            value={value}
            onChange={onChange} 
            {...props}
         />

         {}
         {hasIcon && (
            <button 
               type="button" 
               onClick={onIconClick} 
               className="absolute inset-y-0 right-0 pr-3 flex items-center text-white hover:text-pink transition-colors focus:outline-none"
            >
               {icon}
            </button>
         )}
      </div>
   );
};