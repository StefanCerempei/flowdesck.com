import ProductMetadata from "./components/ProductMetadata";
import Demo from "./pages/Demo";
import Insights from "./pages/ai/Insights";
import Vehicles from "./pages/vehicles/Vehicles";
import Reservations from "./pages/reservations/Reservations";
import BookingCopilot from "./pages/ai/BookingCopilot";
import Workspace from "./Workspace";
import Settings from "./pages/Settings";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import AuthPage from "./pages/auth/AuthPage";
import BusinessPlan from "./pages/BusinessPlan";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/contacts/Contacts"; // Importul modulului de clienți
import Invoices from "./pages/invoices/Invoices";
function App() {
  return (
    <BrowserRouter>
      <ProductMetadata />
      <Routes>
        {/* Ruta principală publică acum duce spre Landing Page */}
        <Route path="/demo" element={<Demo />} />
        <Route path="/" element={<Landing />} />

        <Route path="/business-plan" element={<BusinessPlan />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage register />} />

        {/* Rutele interne ale aplicației */}
        <Route element={<Workspace />}>
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/copilot" element={<BookingCopilot />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
