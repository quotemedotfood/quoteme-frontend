import { Outlet } from 'react-router';
import { AppSidebar } from './AppSidebar';
import { AuthSyncProvider } from './AuthSyncProvider';
import { DemoBanner } from './DemoBanner';
import { isDemoMode } from '../utils/demoMode';

export function RootLayout() {
  const demo = isDemoMode();

  return (
    <AuthSyncProvider>
      <div className="flex h-screen bg-[#FFF9F3]">
        {!demo && <AppSidebar />}
        <div className="flex-1 flex flex-col overflow-hidden">
          {demo && <DemoBanner />}
          <main className="flex-1 overflow-auto pb-20 md:pb-0">
            <Outlet />
          </main>
        </div>
      </div>
    </AuthSyncProvider>
  );
}