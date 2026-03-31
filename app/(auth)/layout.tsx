export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #313a46 0%, #3d4754 50%, #313a46 100%)' }}
    >
      {children}
    </div>
  )
}
