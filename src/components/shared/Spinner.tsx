import { Loader } from 'lucide-react';
import React from 'react';
import clsx from 'clsx';

type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  loaderSize?: number;
  className?: string;
};

const sizeMap: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'min-h-[30vh]',
  md: 'min-h-[50vh]',
  lg: 'min-h-[80vh]',
};

const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  loaderSize = 24,
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex items-center justify-center w-full',
        sizeMap[size],
        className
      )}
    >
      <Loader className="animate-spin text-slate-800" size={loaderSize} />
    </div>
  );
};

export default Spinner;
