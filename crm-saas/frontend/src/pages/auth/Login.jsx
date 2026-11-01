
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Mail,
    Lock,
    ArrowRight,
    Eye,
    EyeOff,
    ShieldCheck
} from 'lucide-react';
import axios from 'axios';
import './Login.css';

export default function Login() {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await axios.post(
                'http://localhost:5000/api/auth/login',
                formData
            );

            localStorage.setItem('token', res.data.token);
            localStorage.setItem(
                'user',
                JSON.stringify(res.data.user)
            );

            navigate('/dashboard');
        } catch (err) {
            setError(
                err.response?.data?.eroare || 'Date incorecte'
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">

            {/* LEFT PANEL */}
            <section className="login-visual">

                <div className="visual-glow glow-one"></div>
                <div className="visual-glow glow-two"></div>

                <div className="brand">
                    <div className="brand-icon">
                        <LayoutDashboard size={25} />
                    </div>
                    <span>Flowdesck</span>
                    <small>CRM</small>
                </div>

                <div className="visual-content">
                    <div className="visual-tag">
                        <span className="status-dot"></span>
                        SMART BUSINESS MANAGEMENT
                    </div>

                    <h1>
                        Gestionează-ți afacerea.
                        <span> Crește fără limite.</span>
                    </h1>

                    <p>
                        Toți clienții, toate vânzările și toate
                        informațiile importante într-un singur loc.
                    </p>

                    <div className="visual-features">
                        <div>
                            <span className="feature-check">✓</span>
                            Management inteligent al clienților
                        </div>
                        <div>
                            <span className="feature-check">✓</span>
                            Automatizarea proceselor
                        </div>
                        <div>
                            <span className="feature-check">✓</span>
                            Rapoarte și statistici în timp real
                        </div>
                    </div>
                </div>

                <div className="visual-footer">
                    <span>© 2026 Flowdesck CRM</span>
                    <span>Built for modern businesses.</span>
                </div>

            </section>

            {/* RIGHT PANEL */}
            <main className="login-form-section">

                <div className="login-card">

                    <div className="mobile-brand">
                        <LayoutDashboard size={26} />
                        <span>Flowdesck</span>
                    </div>

                    <div className="login-heading">
                        <div className="welcome-icon">
                            <Lock size={23} />
                        </div>

                        <h2>Bine ai revenit!</h2>
                        <p>
                            Introdu datele tale pentru a accesa
                            contul companiei.
                        </p>
                    </div>

                    {error && (
                        <div className="login-error">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>

                        <div className="form-group">
                            <label htmlFor="email">
                                Adresă de email
                            </label>

                            <div className="input-wrapper">
                                <Mail size={19} />

                                <input
                                    id="email"
                                    type="email"
                                    placeholder="nume@companie.com"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            email: e.target.value
                                        })
                                    }
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="password-label">
                                <label htmlFor="password">
                                    Parolă
                                </label>
                            </div>

                            <div className="input-wrapper">
                                <Lock size={19} />

                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Introdu parola"
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            password: e.target.value
                                        })
                                    }
                                    required
                                />

                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    aria-label="Arată sau ascunde parola"
                                >
                                    {showPassword
                                        ? <EyeOff size={19} />
                                        : <Eye size={19} />
                                    }
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="login-button"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner"></span>
                                    Se încarcă...
                                </>
                            ) : (
                                <>
                                    Intră în cont
                                    <ArrowRight size={19} />
                                </>
                            )}
                        </button>

                    </form>

                    <div className="login-divider">
                        <span></span>
                        <small>ACCES SECURIZAT</small>
                        <span></span>
                    </div>

                    <div className="security-info">
                        <ShieldCheck size={18} />
                        <span>Datele tale sunt protejate.</span>
                    </div>

                    <p className="register-text">
                        Nu ai un cont pentru companie?
                        <Link to="/register">
                            Înregistrează-te
                        </Link>
                    </p>

                </div>

                <div className="bottom-footer">
                    Flowdesck CRM · Simplifică-ți afacerea
                </div>

            </main>

        </div>
    );
}
