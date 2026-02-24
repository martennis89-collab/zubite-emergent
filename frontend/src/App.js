import "@/App.css";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

// Pages
import HomePage from "@/pages/HomePage";
import CityHubPage from "@/pages/CityHubPage";
import ClinicPage from "@/pages/ClinicPage";
import QuizPage from "@/pages/QuizPage";
import ResultsPage from "@/pages/ResultsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import ContactPage from "@/pages/ContactPage";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminLeads from "@/pages/admin/AdminLeads";
import AdminLeadDetail from "@/pages/admin/AdminLeadDetail";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* National hub (root domain) */}
          <Route path="/" element={<HomePage />} />
          
          {/* City hub routes - simulating subdomain with path for development */}
          {/* In production: haskovo.zubite.bg -> /city/haskovo */}
          <Route path="/city/:citySlug" element={<CityHubPage />} />
          
          {/* Clinic routes */}
          <Route path="/city/:citySlug/c/:clinicSlug" element={<ClinicPage />} />
          
          {/* Quiz routes - city level (unassigned lead) */}
          <Route path="/city/:citySlug/invisalign" element={<QuizPage treatmentType="invisalign" />} />
          <Route path="/city/:citySlug/implants" element={<QuizPage treatmentType="implants" />} />
          <Route path="/city/:citySlug/full-mouth" element={<QuizPage treatmentType="full_mouth" />} />
          
          {/* Quiz routes - clinic specific (auto-assigned lead) */}
          <Route path="/city/:citySlug/c/:clinicSlug/invisalign" element={<QuizPage treatmentType="invisalign" />} />
          <Route path="/city/:citySlug/c/:clinicSlug/implants" element={<QuizPage treatmentType="implants" />} />
          <Route path="/city/:citySlug/c/:clinicSlug/full-mouth" element={<QuizPage treatmentType="full_mouth" />} />
          
          {/* Results */}
          <Route path="/results/:leadId" element={<ResultsPage />} />
          
          {/* Static pages */}
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          
          {/* Admin routes */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/leads" element={<AdminLeads />} />
          <Route path="/admin/leads/:leadId" element={<AdminLeadDetail />} />
          
          {/* Legacy routes redirect - keep old URLs working */}
          <Route path="/invisalign" element={<QuizPage treatmentType="invisalign" legacyMode />} />
          <Route path="/implants" element={<QuizPage treatmentType="implants" legacyMode />} />
          <Route path="/full-mouth" element={<QuizPage treatmentType="full_mouth" legacyMode />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
