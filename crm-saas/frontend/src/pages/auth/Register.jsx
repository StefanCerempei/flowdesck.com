import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Register() {
    const [formData, setFormData] = useState({ companyName: '', email: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/auth/register', formData);
            navigate('/login'); // Redirecționăm automat la login după creare
        } catch (err) {
            setError(err.response?.data?.eroare || 'Eroare la înregistrare');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md border border-gray-100">
                <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Creează un cont nou</h2>
                {error && <p className="text-red-500 text-sm mb-4 text-center bg-red-50 py-2 rounded">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        placeholder="Numele Companiei"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        required
                    />
                    <input
                        type="email"
                        placeholder="Email administrator"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Parolă"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                    />
                    <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-md hover:bg-blue-700 transition font-medium">
                        Înregistrare Companie
                    </button>
                </form>
                <p className="mt-4 text-center text-sm text-gray-600">
                    Ai deja cont? <Link to="/login" className="text-blue-600 hover:underline font-medium">Autentifică-te</Link>
                </p>
            </div>
        </div>
    );
}