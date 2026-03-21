import ErrorBoundary from '../components/ErrorBoundary';

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
