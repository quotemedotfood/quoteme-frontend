import { Outlet } from 'react-router';
import { AppSidebar } from './AppSidebar';
import { AuthSyncProvider } from './AuthSyncProvider';

export function RootLayout() {
  return (
    <AuthSyncProvider>
      <div className="flex h-screen bg-[#FFF9F3]">
        <AppSidebar />
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>
    </AuthSyncProvider>
  );
}