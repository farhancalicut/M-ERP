export function PageContainer({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-7xl ${className}`}>
      {children}
    </div>
  );
}
