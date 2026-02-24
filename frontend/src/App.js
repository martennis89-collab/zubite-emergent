import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

// Pages
import HomePage from "@/pages/HomePage";
import InvisalignPage from "@/pages/InvisalignPage";
import ImplantsPage from "@/pages/ImplantsPage";
import FullMouthPage from "@/pages/FullMouthPage";
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
          <Route path="/" element={<HomePage />} />
          <Route path="/invisalign" element={<InvisalignPage />} />
          <Route path="/implants" element={<ImplantsPage />} />
          <Route path="/full-mouth" element={<FullMouthPage />} />
          <Route path="/results/:leadId" element={<ResultsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/leads" element={<AdminLeads />} />
          <Route path="/admin/leads/:leadId" element={<AdminLeadDetail />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
