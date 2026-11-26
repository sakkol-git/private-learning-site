import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AppShell } from './components/AppShell';
import { ProgressContext, useProgressState } from './hooks/useProgress';
import { HomePage } from './pages/HomePage';
import { LessonPage } from './pages/LessonPage';

export function App() {
  const progress = useProgressState();
  return (
    <ProgressContext value={progress}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="lesson/:slug" element={<Navigate to="1" replace />} />
            <Route path="lesson/:slug/:step" element={<LessonPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProgressContext>
  );
}
