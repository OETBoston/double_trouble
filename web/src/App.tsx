import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { AppHeader } from "./components/AppHeader";

// Both routes pull in mapbox-gl (and the dashboard also pulls in recharts),
// which are large; loading them only for the route that needs them keeps the
// initial report-flow bundle small for the common "quick report" case.
const ReportFlow = lazy(() => import("./pages/Report/ReportFlow").then((m) => ({ default: m.ReportFlow })));
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard").then((m) => ({ default: m.Dashboard })));

export default function App() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <AppHeader />
      <main id="main-content">
        <Suspense fallback={<p role="status">Loading…</p>}>
          <Routes>
            <Route path="/" element={<ReportFlow />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
}
