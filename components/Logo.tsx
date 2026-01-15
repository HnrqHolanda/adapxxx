'use client';

export default function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="border-4 border-gold rounded-full p-6 mb-6 animate-pulse">
        <span className="text-gold text-6xl font-serif">IME</span>
      </div>
      <h1 className="text-gold text-3xl font-bold tracking-widest mb-2">
        ADAPTAÇÃO
      </h1>
      <p className="text-silver text-lg tracking-widest">
        XXX
      </p>
      <div className="w-32 h-1 bg-gold mt-4 rounded-full" />
      <p className="text-silver-dark text-sm mt-4 italic">
        Nossa missão é formar
      </p>
    </div>
  );
}