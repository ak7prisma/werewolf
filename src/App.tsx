import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { AppLayout } from '@/components/AppLayout';

const GamePage = lazy(() => import('@/pages/GamePage').then((m) => ({ default: m.GamePage })));
const CardsPage = lazy(() => import('@/pages/CardsPage').then((m) => ({ default: m.CardsPage })));
const OnlinePage = lazy(() =>
  import('@/pages/OnlinePage').then((m) => ({ default: m.OnlinePage })),
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-10 text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            index
            element={
              <Suspense fallback={<RouteFallback />}>
                <GamePage />
              </Suspense>
            }
          />
          <Route
            path="katalog"
            element={
              <Suspense fallback={<RouteFallback />}>
                <CardsPage />
              </Suspense>
            }
          />
          <Route
            path="online"
            element={
              <Suspense fallback={<RouteFallback />}>
                <OnlinePage />
              </Suspense>
            }
          />
          <Route
            path="*"
            element={
              <Suspense fallback={<RouteFallback />}>
                <NotFoundPage />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
