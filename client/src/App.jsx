import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import InlineTaggingPage from "./pages/InlineTaggingPage";
import LegacyHomePage from "./pages/LegacyHomePage";
import ProcessingPage from "./pages/ProcessingPage";
import ResultPage from "./pages/ResultPage";

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<InlineTaggingPage />} />
        <Route path="/pipeline" element={<LegacyHomePage />} />
        <Route path="/process/:id" element={<ProcessingPage />} />
        <Route path="/result/:id" element={<ResultPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
