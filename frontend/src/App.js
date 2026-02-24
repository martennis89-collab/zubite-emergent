import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/context/LanguageContext";

import HomePage from "@/pages/HomePage";
import TreatmentSelectPage from "@/pages/TreatmentSelectPage";
import QuizPage from "@/pages/QuizPage";
import ResultsPage from "@/pages/ResultsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import ContactPage from "@/pages/ContactPage";
import SymptomsPage from "@/pages/SymptomsPage";
import SymptomDetailPage from "@/pages/SymptomDetailPage";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminLeads from "@/pages/admin/AdminLeads";
import AdminLeadDetail from "@/pages/admin/AdminLeadDetail";

// Wrapper component for language-enabled routes
const AppRoutes = () => {
  return (
    <LanguageProvider>
      <Routes>
        {/* Bulgarian (default) routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/city/:citySlug" element={<TreatmentSelectPage />} />
        <Route path="/city/:citySlug/:treatmentType" element={<QuizPage />} />
        <Route path="/results/:leadId" element={<ResultsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/symptoms" element={<SymptomsPage />} />
        <Route path="/symptoms/:symptomSlug" element={<SymptomDetailPage />} />
        
        {/* English routes */}
        <Route path="/en" element={<HomePage />} />
        <Route path="/en/city/:citySlug" element={<TreatmentSelectPage />} />
        <Route path="/en/city/:citySlug/:treatmentType" element={<QuizPage />} />
        <Route path="/en/results/:leadId" element={<ResultsPage />} />
        <Route path="/en/privacy" element={<PrivacyPage />} />
        <Route path="/en/terms" element={<TermsPage />} />
        <Route path="/en/contact" element={<ContactPage />} />
        <Route path="/en/symptoms" element={<SymptomsPage />} />
        <Route path="/en/symptoms/:symptomSlug" element={<SymptomDetailPage />} />
        
        {/* Admin routes (no translation needed) */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/leads" element={<AdminLeads />} />
        <Route path="/admin/leads/:leadId" element={<AdminLeadDetail />} />
      </Routes>
    </LanguageProvider>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
