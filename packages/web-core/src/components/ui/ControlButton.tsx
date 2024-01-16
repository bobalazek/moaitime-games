import React, { ButtonHTMLAttributes, useEffect, useState } from 'react';

import { cn } from '../../utils/StyleHelpers';

export const ControlButton: React.FC<ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  ...rest
}) => {
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    if (isPressed) {
      navigator?.vibrate?.(100);
    }
  }, [isPressed]);

  return (
    <button
      type="button"
      className={cn(
        `flex h-20 w-20 select-none items-center justify-center rounded-full bg-slate-600 hover:bg-slate-500 focus:bg-slate-400`,
        isPressed && `scale-90`
      )}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      {...rest}
    >
      {children}
    </button>
  );
};
