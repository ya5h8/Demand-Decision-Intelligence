import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, X, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./Auth.css";

const REMEMBER_KEY = "ddi_remembered_username";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const usernameInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const [form, setForm] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({ username: "", password: "" });
  const [touched, setTouched] = useState({ username: false, password: false });
  const [rememberMe, setRememberMe] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // Load remembered user on mount
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setForm((prev) => ({ ...prev, username: saved }));
      setRememberMe(true);
    }
  }, []);

  // Validation function
  const validateField = (name, value) => {
    const val = value ? value.trim() : "";
    if (name === "username") {
      if (!val) {
        return "Email or username is required.";
      }
      if (val.includes("@")) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) {
          return "Please enter a valid email address (e.g. name@company.com).";
        }
      } else if (val.length < 3) {
        return "Username must be at least 3 characters.";
      }
      return "";
    }

    if (name === "password") {
      if (!value) {
        return "Password is required.";
      }
      if (value.length < 6) {
        return "Password must be at least 6 characters.";
      }
      return "";
    }

    return "";
  };

  const handleChange = (name) => (e) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, [name]: val }));

    if (serverError) setServerError("");

    // If already touched, validate in real time
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

    // Mark all as touched
    setTouched({ username: true, password: true });

    const usernameErr = validateField("username", form.username);
    const passwordErr = validateField("password", form.password);

    setErrors({ username: usernameErr, password: passwordErr });

    if (usernameErr) {
      usernameInputRef.current?.focus();
      return;
    }
    if (passwordErr) {
      passwordInputRef.current?.focus();
      return;
    }

    setServerError("");
    setLoading(true);

    try {
      await login(form.username.trim(), form.password);

      // Persist remember me
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, form.username.trim());
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        (err?.response?.status === 401
          ? "Incorrect email or password. Please verify your credentials."
          : err?.message === "Network Error"
          ? "Unable to connect to the backend server. Please verify the API is running."
          : "Sign-in failed. Please check your credentials and try again.");
      setServerError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  }

  // Forgot password handler
  const handleForgotSubmit = (e) => {
    e.preventDefault();
    const val = forgotEmail.trim();
    if (!val) {
      setForgotError("Please enter your work email address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      setForgotError("Please enter a valid email format.");
      return;
    }

    setForgotError("");
    setForgotSubmitted(true);
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotSubmitted(false);
    setForgotEmail("");
    setForgotError("");
  };

  return (
    <div className="invooce-page">
      {/* ── Top Header Brand Bar ── */}
      <header className="invooce-header">
        <Link to="/" className="invooce-brand">
          <span className="invooce-brand-icon" />
          <span className="invooce-brand-text">DemandIQ</span>
        </Link>
      </header>

      {/* ── Centered Content ── */}
      <main className="invooce-body">
        <div className="invooce-container">
          <div className="invooce-title-wrap">
            <h1 className="invooce-title">Login</h1>
            <p className="invooce-subtitle">Hi, Welcome back 👋</p>
          </div>

          {/* Server Error Alert Banner */}
          {serverError && (
            <div className="invooce-error" role="alert">
              <AlertCircle size={18} />
              <span>{serverError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="invooce-form" noValidate>
            {/* Email Field */}
            <div className="invooce-field">
              <label htmlFor="login-email" className="invooce-label">
                <span>Email</span>
              </label>
              <div className="invooce-input-wrap">
                <input
                  ref={usernameInputRef}
                  id="login-email"
                  type="text"
                  className={`invooce-input ${
                    touched.username && errors.username ? "invooce-input-error" : ""
                  }`}
                  placeholder="E.g. johndoe@email.com"
                  value={form.username}
                  onChange={handleChange("username")}
                  onBlur={handleBlur("username")}
                  autoComplete="username"
                  aria-invalid={touched.username && !!errors.username}
                  aria-describedby={
                    touched.username && errors.username ? "email-error" : undefined
                  }
                  autoFocus
                />
              </div>
              {touched.username && errors.username && (
                <div id="email-error" className="invooce-field-error" role="alert">
                  {errors.username}
                </div>
              )}
            </div>

            {/* Password Field */}
            <div className="invooce-field">
              <label htmlFor="login-password" className="invooce-label">
                <span>Password</span>
              </label>
              <div className="invooce-input-wrap">
                <input
                  ref={passwordInputRef}
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  className={`invooce-input invooce-input-pw ${
                    touched.password && errors.password ? "invooce-input-error" : ""
                  }`}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange("password")}
                  onBlur={handleBlur("password")}
                  autoComplete="current-password"
                  aria-invalid={touched.password && !!errors.password}
                  aria-describedby={
                    touched.password && errors.password ? "password-error" : undefined
                  }
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
                <div id="password-error" className="invooce-field-error" role="alert">
                  {errors.password}
                </div>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="invooce-options-row">
              <label className="invooce-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember Me</span>
              </label>

              <button
                type="button"
                className="invooce-forgot-link"
                onClick={() => setShowForgotModal(true)}
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button with Loading State */}
            <button
              id="login-submit"
              type="submit"
              className="invooce-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="invooce-spinner" />
                  <span>Logging in…</span>
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>

          {/* Switch to Register */}
          <p className="invooce-switch">
            Not registered yet?{" "}
            <Link to="/register" className="invooce-switch-link">
              Create an account ↗
            </Link>
          </p>
        </div>
      </main>

      {/* ── Forgot Password Modal ── */}
      {showForgotModal && (
        <div
          className="invooce-modal-overlay"
          onClick={closeForgotModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="invooce-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="invooce-modal-header">
              <h3 className="invooce-modal-title">Reset Password</h3>
              <button
                type="button"
                className="invooce-modal-close"
                onClick={closeForgotModal}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {!forgotSubmitted ? (
              <form onSubmit={handleForgotSubmit} className="invooce-form" noValidate>
                <p className="invooce-modal-desc">
                  Enter your registered work email and we'll send you instructions to reset your account password.
                </p>

                <div className="invooce-field">
                  <label htmlFor="forgot-email-input" className="invooce-label">
                    Email address
                  </label>
                  <input
                    id="forgot-email-input"
                    type="email"
                    className={`invooce-input ${forgotError ? "invooce-input-error" : ""}`}
                    placeholder="E.g. johndoe@email.com"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (forgotError) setForgotError("");
                    }}
                    autoFocus
                  />
                  {forgotError && (
                    <div className="invooce-field-error" role="alert">
                      {forgotError}
                    </div>
                  )}
                </div>

                <div className="invooce-modal-actions">
                  <button
                    type="button"
                    className="invooce-modal-cancel"
                    onClick={closeForgotModal}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="invooce-modal-submit">
                    Send Link
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#16a34a" }}>
                  <CheckCircle2 size={24} />
                  <span style={{ fontWeight: 600, fontSize: "15px" }}>Instructions Sent</span>
                </div>
                <p className="invooce-modal-desc">
                  If an account exists for <strong>{forgotEmail}</strong>, an email with password recovery steps has been dispatched.
                </p>
                <button
                  type="button"
                  className="invooce-submit-btn"
                  onClick={closeForgotModal}
                  style={{ marginTop: 8 }}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
