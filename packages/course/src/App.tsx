import { courseDirectory } from './directory';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AppShell } from './components/AppShell';
import { CourseContext, type CourseConfig, type CourseInfo } from './config';
import { ProgressContext, useProgressState } from './hooks/useProgress';
import { createTranslate } from './i18n';
import { HomePage } from './pages/HomePage';
import { LessonPage } from './pages/LessonPage';

/** Builds the whole site (shell, home, lessons, search) for one course. */
export function createCourseApp<M, A extends string, I, C>(config: CourseConfig<M, A, I, C>) {
  const info: CourseInfo = {
    id: config.id,
    directory: courseDirectory(
      import.meta.env.VITE_COURSE_ORIGINS,
      import.meta.env.DEV ? window.location.hostname : undefined,
    ),
    siteName: config.siteName,
    authorName: config.authorName,
    catalog: config.catalog,
    chapters: config.chapters,
    home: config.home,
    notice: config.notice,
    t: createTranslate(config.messages),
  };

  return function CourseApp() {
    const progress = useProgressState();
    return (
      <CourseContext value={info}>
        <ProgressContext value={progress}>
          <BrowserRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route
                  index
                  element={<HomePage chapterNavigation={config.chapterNavigation ?? false} />}
                />
                <Route path="lesson/:slug" element={<Navigate to="1" replace />} />
                <Route path="lesson/:slug/:step" element={<LessonPage config={config} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ProgressContext>
      </CourseContext>
    );
  };
}
