import React from 'react';

interface GeminiSparkleProps {
  className?: string;
  size?: number;
  animate?: boolean;
}

export const GeminiSparkle: React.FC<GeminiSparkleProps> = ({ 
  className = "w-5 h-5", 
  size = 20,
  animate = false 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 28 28" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animate ? 'animate-pulse' : ''}`}
    >
      <defs>
        <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4da3ff" />
          <stop offset="35%" stopColor="#9b72cf" />
          <stop offset="70%" stopColor="#e06277" />
          <stop offset="100%" stopColor="#ff9e7d" />
        </linearGradient>
        <linearGradient id="gemini-subtle" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#70a6ff" />
          <stop offset="100%" stopColor="#bb86fc" />
        </linearGradient>
      </defs>
      {/* Gemini 4-pointed curved star shape */}
      <path 
        d="M14 1C14 8.1797 8.1797 14 1 14C8.1797 14 14 19.8203 14 27C14 19.8203 19.8203 14 27 14C19.8203 14 14 8.1797 14 1Z" 
        fill="url(#gemini-gradient)" 
      />
    </svg>
  );
};
