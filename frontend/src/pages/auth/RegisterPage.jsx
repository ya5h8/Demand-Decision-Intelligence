import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./Auth.css";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    full_name: "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const validateField = (name, value) => {
    const val = value ? value.trim() : "";
    if (name === "full_name") {
      if (!val) return "Full name is required.";
      if (val.length < 2) return "Full name must be at least 2 characters.";
      return "";
    }
    if (name === "username") {
      if (!val) return "Username is required.";
      if (val.length < 3) return "Username must be at least 3 characters.";
      if (!/^[a-zA-Z0-9_]+$/.test(val)) return "Username can only contain letters, numbers, and underscores.";
      return "";
    }
    if (name === "email") {
      if (!val) return "Email address is required.";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) return "Please enter a valid email address.";
      return "";
    }
    if (name === "password") {
      if (!value) return "Password is required.";
      if (value.length < 8 || value.length > 20) return "Password must be between 8 and 20 characters.";
      if (/\s/.test(value)) return "Password must not contain spaces.";
      if (!/[a-z]/.test(value)) return "Password must contain at least one lowercase letter.";
      if (!/[A-Z]/.test(value)) return "Password must contain at least one uppercase letter.";
      if (!/\d/.test(value)) return "Password must contain at least one number.";
      if (!/[!@#$%^&*]/.test(value)) return "Password must contain at least one special symbol (!@#$%^&*).";
      return "";
    }
    return "";
  };

  const handleChange = (name) => (e) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, [name]: val }));
    if (serverError) setServerError("");

    if (touched[name]) {
      const fieldErr = validateField(name, val);
      setErrors((prev) => ({ ...prev, [name]: fieldErr }));
    }
  };

  const handleBlur = (name) => () => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const fieldErr = validateField(name, form[name]);
    setErrors((prev) => ({ ...prev, [name]: fieldErr }));
  };

  async function handleSubmit(e) {
    e.preventDefault();

    const newTouched = { full_name: true, username: true, email: true, password: true };
    setTouched(newTouched);

    const newErrors = {
      full_name: validateField("full_name", form.full_name),
      username: validateField("username", form.username),
      email: validateField("email", form.email),
      password: validateField("password", form.password),
    };
    setErrors(newErrors);

    if (Object.values(newErrors).some((err) => err)) {
      return;
    }

    setServerError("");
    setLoading(true);
    try {
      await register({
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const d = err?.response?.data?.detail;
      setServerError(
        typeof d === "string" ? d : "Registration failed. Please check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="invooce-page">
      <header className="invooce-header">
        <Link to="/" className="invooce-brand">
          <span className="invooce-brand-icon" />
          <span className="invooce-brand-text">DemandIQ</span>
        </Link>
      </header>

      <main className="invooce-body">
        <div className="invooce-container">
          <div className="invooce-title-wrap">
            <h1 className="invooce-title">Create Account</h1>
            <p className="invooce-subtitle">Join DemandIQ to get started 🚀</p>
          </div>

          {serverError && (
            <div className="invooce-error" role="alert">
              <AlertCircle size={18} />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="invooce-form" noValidate>
            <div className="invooce-field">
              <label htmlFor="reg-fullname" className="invooce-label">
                Full Name
              </label>
              <div className="invooce-input-wrap">
                <input
                  id="reg-fullname"
                  type="text"
                  className={`invooce-input ${
                    touched.full_name && errors.full_name ? "invooce-input-error" : ""
                  }`}
                  placeholder="E.g. John Doe"
                  value={form.full_name}
                  onChange={handleChange("full_name")}
                  onBlur={handleBlur("full_name")}
                  autoFocus
                />
              </div>
              {touched.full_name && errors.full_name && (
                <div className="invooce-field-error" role="alert">
                  {errors.full_name}
                </div>
              )}
            </div>

            <div className="invooce-field">
              <label htmlFor="reg-username" className="invooce-label">
                Username
              </label>
              <div className="invooce-input-wrap">
                <input
                  id="reg-username"
                  type="text"
                  className={`invooce-input ${
                    touched.username && errors.username ? "invooce-input-error" : ""
                  }`}
                  placeholder="johndoe"
                  value={form.username}
                  onChange={handleChange("username")}
                  onBlur={handleBlur("username")}
                  autoComplete="username"
                  required
                />
              </div>
              {touched.username && errors.username && (
                <div className="invooce-field-error" role="alert">
                  {errors.username}
                </div>
              )}
            </div>

            <div className="invooce-field">
              <label htmlFor="reg-email" className="invooce-label">
                Email
              </label>
              <div className="invooce-input-wrap">
                <input
                  id="reg-email"
                  type="email"
                  className={`invooce-input ${
                    touched.email && errors.email ? "invooce-input-error" : ""
                  }`}
                  placeholder="E.g. johndoe@email.com"
                  value={form.email}
                  onChange={handleChange("email")}
                  onBlur={handleBlur("email")}
                  autoComplete="email"
                  required
                />
              </div>
              {touched.email && errors.email && (
                <div className="invooce-field-error" role="alert">
                  {errors.email}
                </div>
              )}
            </div>

            <div className="invooce-field">
              <label htmlFor="reg-password" className="invooce-label">
                Password
              </label>
              <div className="invooce-input-wrap">
                <input
                  id="reg-password"
                  type={showPw ? "text" : "password"}
                  className={`invooce-input invooce-input-pw ${
                    touched.password && errors.password ? "invooce-input-error" : ""
                  }`}
                  placeholder="8-20 characters (A-z, 0-9, !@#$%^&*)"
                  value={form.password}
                  onChange={handleChange("password")}
                  onBlur={handleBlur("password")}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="invooce-pw-toggle"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPw ? (
                    <EyeOff size={18} strokeWidth={1.8} />
                  ) : (
                    <Eye size={18} strokeWidth={1.8} />
                  )}
                </button>
              </div>
              {touched.password && errors.password && (
                <div className="invooce-field-error" role="alert">
                  {errors.password}
                </div>
              )}
            </div>

            <button
              id="register-submit"
              type="submit"
              className="invooce-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="invooce-spinner" />
                  <span>Creating account…</span>
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="invooce-switch">
            Already have an account?{" "}
            <Link to="/login" className="invooce-switch-link">
              Sign in ↗
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
