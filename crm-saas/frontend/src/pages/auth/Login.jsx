import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:5000/api/auth/login', formData);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            navigate('/dashboard'); // Pregătim ruta pentru panoul principal
        } catch (err) {
            setError(err.response?.data?.eroare || 'Date incorecte');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md border border-gray-100">
                <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Autentificare CRM</h2>
                {error && <p className="text-red-500 text-sm mb-4 text-center bg-red-50 py-2 rounded">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Email"
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
                        Intră în cont
                    </button>
                </form>
                <p className="mt-4 text-center text-sm text-gray-600">
                    Nu ai un cont? <Link to="/register" className="text-blue-600 hover:underline font-medium">Creează companie</Link>
                </p>
            </div>
        </div>
    );
}