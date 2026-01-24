import React from 'react';

function Button({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="w-full py-4 bg-[#FB7CF0] hover:bg-[#FB7CF0]/90 text-[rgba(85,17,88,1)] rounded-xl text-lg font-medium shadow-[0px_2px_4.5px_rgba(0,0,0,0.1),inset_0px_-4px_4.7px_rgba(0,0,0,0.05),inset_0px_4px_4px_rgba(255,255,255,0.25)] border border-[rgba(0,0,0,0.09)]"
    >
      {children}
    </button>
  );
}

export default Button;
