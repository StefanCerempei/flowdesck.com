import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Building2,
    Mail,
    LockKeyhole,
    ArrowRight,
    CheckCircle2,
    ShieldCheck,
    Eye,
    EyeOff,
    Sparkles,
} from "lucide-react";
import axios from "axios";
import "./Register.css";

export default function Register() {
    const [formData, setFormData] = useState({
        companyName: "",
        email: "",
        password: "",
    });
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            await axios.post(
                "http://localhost:5000/api/auth/register",
                formData
            );
            navigate("/login");
        } catch (err) {
            setError(
                err.response?.data?.eroare ||
                err.response?.data?.message ||
                "Nu am putut crea contul. Încearcă din nou."
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="register-page">
            {/* Left side – same visual identity as Login */}
            <section className="register-visual">
                <div className="register-glow register-glow-one" />
                <div className="register-glow register-glow-two" />
                <div className="register-grid-pattern" />

                <div className="register-visual-content">
                    <Link to="/login" className="register-brand">
                        <div className="register-brand-icon">
                            <LayoutDashboard size={23} />
                        </div>
                        <span>Flowdesck<span className="register-brand-dot">.</span></span>
                    </Link>

                    <div className="register-visual-main">
                        <div className="register-eyebrow">
                            <Sparkles size={14} />
                            The CRM built for ambitious teams
                        </div>

                        <h1>
                            Your business.
                            <br />
                            <span>One workspace.</span>
                        </h1>

                        <p className="register-visual-description">
                            Manage customers, organize sales, coordinate your team
                            and grow your business — all from one powerful platform.
                        </p>

                        <div className="register-feature-list">
                            {[
                                "Manage customers and leads",
                                "Track sales and business performance",
                                "Collaborate with your entire team",
                                "Keep your business organized",
                            ].map((feature) => (
                                <div className="register-feature" key={feature}>
                                    <span className="register-feature-check">
                                        <CheckCircle2 size={15} />
                                    </span>
                                    {feature}
                                </div>
                            ))}
                        </div>

                        <div className="register-preview">
                            <div className="register-preview-heading">
                                <span>Business overview</span>
                                <span className="register-live">
                                    <i /> Live preview
                                </span>
                            </div>

                            <div className="register-preview-stats">
                                <div className="register-preview-stat">
                                    <span>Total contacts</span>
                                    <strong>1,248</strong>
                                    <small>+12.8%</small>
                                </div>
                                <div className="register-preview-stat">
                                    <span>Revenue</span>
                                    <strong>€45.2k</strong>
                                    <small>+8.4%</small>
                                </div>
                            </div>

                            <div className="register-preview-chart">
                                {[35, 50, 40, 65, 48, 75, 60, 90, 70, 100].map((height, i) => (
                                    <span
                                        key={i}
                                        className={i === 9 ? "highlight" : ""}
                                        style={{ height: `${height}%` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="register-visual-footer">
                        <span>© 2026 Flowdesck. All rights reserved.</span>
                        <span>Built for better business.</span>
                    </div>
                </div>
            </section>

            {/* Right side – white form card */}
            <section className="register-form-side">
                <div className="register-mobile-brand">
                    <div className="register-brand-icon">
                        <LayoutDashboard size={21} />
                    </div>
                    <span>Flowdesck<span className="register-brand-dot">.</span></span>
                </div>

                <div className="register-form-wrap">
                    <div className="register-form-card">
                        <div className="register-form-heading">
                            <div className="register-form-icon">
                                <Building2 size={24} />
                            </div>
                            <span className="register-form-eyebrow">GET STARTED</span>
                            <h2>Create your workspace</h2>
                            <p>
                                Create your company account and start managing
                                your business with Flowdesck.
                            </p>
                        </div>

                        {error && (
                            <div className="register-error" role="alert">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="register-form">
                            <div className="register-field">
                                <label htmlFor="companyName">Company name</label>
                                <div className="register-input-wrap">
                                    <Building2 size={18} />
                                    <input
                                        id="companyName"
                                        type="text"
                                        name="companyName"
                                        value={formData.companyName}
                                        onChange={handleChange}
                                        placeholder="Example: Tech Solutions SRL"
                                        autoComplete="organization"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="register-field">
                                <label htmlFor="registerEmail">Administrator email</label>
                                <div className="register-input-wrap">
                                    <Mail size={18} />
                                    <input
                                        id="registerEmail"
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="admin@company.com"
                                        autoComplete="email"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="register-field">
                                <label htmlFor="registerPassword">Password</label>
                                <div className="register-input-wrap">
                                    <LockKeyhole size={18} />
                                    <input
                                        id="registerPassword"
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="At least 8 characters"
                                        autoComplete="new-password"
                                        minLength={8}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="register-password-toggle"
                                        onClick={() => setShowPassword((visible) => !visible)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <span className="register-field-hint">
                                    Use at least 8 characters.
                                </span>
                            </div>

                            <button
                                type="submit"
                                className="register-submit"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="register-spinner" />
                                        Creating workspace...
                                    </>
                                ) : (
                                    <>
                                        Create company account
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="register-security">
                            <ShieldCheck size={16} />
                            Your workspace is protected.
                        </div>

                        <div className="register-login-link">
                            Already have an account?{" "}
                            <Link to="/login">Sign in</Link>
                        </div>
                    </div>
                </div>

                <div className="register-mobile-footer">
                    © 2026 Flowdesck CRM
                </div>
            </section>
        </div>
    );
}
