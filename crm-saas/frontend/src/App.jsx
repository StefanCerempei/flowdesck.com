import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/contacts/Contacts'; // Importul modulului de clienți
import Invoices from './pages/invoices/Invoices';
function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Ruta principală publică acum duce spre Landing Page */}
                <Route path="/" element={<Landing />} />

                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Rutele interne ale aplicației */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/invoices" element={<Invoices />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;