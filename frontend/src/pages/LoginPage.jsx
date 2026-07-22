import {
    useEffect,
    useState,
  } from "react";
  
  import {
    Activity,
    Ambulance,
    CheckCircle2,
    Eye,
    EyeOff,
    LoaderCircle,
    LockKeyhole,
    Mail,
    MapPinned,
    ShieldCheck,
  } from "lucide-react";
  
  import {
    useLocation,
    useNavigate,
  } from "react-router-dom";
  
  import { loginFormSchema } from "../schemas/authSchemas";
  
  import { useAuthStore } from "../stores/authStore";
  
  import "../styles/login.css";
  
  const initialFormValues = {
    email: "",
    password: "",
    rememberMe: false,
  };
  
  function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
  
    const login = useAuthStore(
      (state) => state.login,
    );
  
    const authenticationStatus =
      useAuthStore(
        (state) => state.status,
      );
  
    const authenticationError =
      useAuthStore(
        (state) => state.error,
      );
  
    const backendFieldErrors =
      useAuthStore(
        (state) =>
          state.fieldErrors,
      );
  
    const clearAuthenticationError =
      useAuthStore(
        (state) =>
          state.clearAuthenticationError,
      );
  
    const [formValues, setFormValues] =
      useState(initialFormValues);
  
    const [fieldErrors, setFieldErrors] =
      useState({});
  
    const [
      showPassword,
      setShowPassword,
    ] = useState(false);
  
    const isSubmitting =
      authenticationStatus ===
      "authenticating";
  
    useEffect(() => {
      return () => {
        clearAuthenticationError();
      };
    }, [clearAuthenticationError]);
  
    function handleInputChange(event) {
      const {
        name,
        value,
        type,
        checked,
      } = event.target;
  
      const nextValue =
        type === "checkbox"
          ? checked
          : value;
  
      setFormValues(
        (currentValues) => ({
          ...currentValues,
          [name]: nextValue,
        }),
      );
  
      setFieldErrors(
        (currentErrors) => ({
          ...currentErrors,
          [name]: "",
        }),
      );
  
      clearAuthenticationError();
    }
  
    async function handleSubmit(event) {
      event.preventDefault();
  
      setFieldErrors({});
      clearAuthenticationError();
  
      const validationResult =
        loginFormSchema.safeParse(
          formValues,
        );
  
      if (!validationResult.success) {
        const nextErrors = {};
  
        for (
          const issue of
          validationResult.error.issues
        ) {
          const fieldName =
            issue.path[0];
  
          if (
            fieldName &&
            !nextErrors[fieldName]
          ) {
            nextErrors[fieldName] =
              issue.message;
          }
        }
  
        setFieldErrors(nextErrors);
        return;
      }
  
      const result = await login(
        validationResult.data,
      );
  
      if (!result.success) {
        setFieldErrors(
          result.fieldErrors || {},
        );
  
        return;
      }
  
      const requestedPath =
        location.state?.from?.pathname;
  
      navigate(
        requestedPath || "/dashboard",
        {
          replace: true,
        },
      );
    }
  
    const displayedEmailError =
      fieldErrors.email ||
      backendFieldErrors.email;
  
    const displayedPasswordError =
      fieldErrors.password ||
      backendFieldErrors.password;
  
    return (
      <main className="login-page">
        <section className="login-visual">
          <div
            className="login-visual__grid"
            aria-hidden="true"
          />
  
          <div className="login-visual__orb login-visual__orb--one" />
          <div className="login-visual__orb login-visual__orb--two" />
  
          <div className="login-brand">
            <div className="login-brand__icon">
              <Activity
                size={26}
                strokeWidth={2.2}
              />
            </div>
  
            <div>
              <p className="login-brand__name">
                MedResponse
              </p>
  
              <p className="login-brand__caption">
                Medical Monitoring System
              </p>
            </div>
          </div>
  
          <div className="login-hero">
            <span className="login-hero__eyebrow">
              INTERACTIVE MEDICAL OPERATIONS
            </span>
  
            <h1>
              Coordinate care.
              <br />
              Respond faster.
            </h1>
  
            <p>
              A real-time command center for
              monitoring medical facilities,
              ambulance locations, emergency
              alerts, and operational capacity
              across Syria.
            </p>
  
            <div className="login-capabilities">
              <article className="login-capability">
                <div className="login-capability__icon">
                  <MapPinned size={21} />
                </div>
  
                <div>
                  <h2>GIS Operations</h2>
  
                  <p>
                    Monitor facilities and
                    resources on an interactive
                    map.
                  </p>
                </div>
              </article>
  
              <article className="login-capability">
                <div className="login-capability__icon">
                  <Ambulance size={21} />
                </div>
  
                <div>
                  <h2>Emergency Dispatch</h2>
  
                  <p>
                    Identify available ambulances
                    and coordinate response.
                  </p>
                </div>
              </article>
  
              <article className="login-capability">
                <div className="login-capability__icon">
                  <Activity size={21} />
                </div>
  
                <div>
                  <h2>Live Capacity</h2>
  
                  <p>
                    Track hospital occupancy and
                    receive immediate alerts.
                  </p>
                </div>
              </article>
            </div>
          </div>
  
          <div className="login-system-card">
            <div className="login-system-card__status">
              <span className="login-system-card__pulse" />
  
              <div>
                <p>System status</p>
                <strong>Operational</strong>
              </div>
            </div>
  
            <div className="login-system-card__metrics">
              <div>
                <span>Connection</span>
                <strong>Secure</strong>
              </div>
  
              <div>
                <span>Monitoring</span>
                <strong>Real time</strong>
              </div>
            </div>
          </div>
  
          <p className="login-visual__footer">
            Interactive Medical Monitoring and
            Response System
          </p>
        </section>
  
        <section className="login-panel">
          <div className="login-panel__content">
            <div className="login-security-badge">
              <ShieldCheck size={17} />
  
              <span>
                SECURE OPERATIONS PORTAL
              </span>
            </div>
  
            <header className="login-header">
              <h2>Welcome back</h2>
  
              <p>
                Sign in with your authorized
                health management account to
                access the live operations
                dashboard.
              </p>
            </header>
  
            <form
              className="login-form"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="login-form__group">
                <label htmlFor="email">
                  Email address
                </label>
  
                <div
                  className={`login-input ${
                    displayedEmailError
                      ? "login-input--error"
                      : ""
                  }`}
                >
                  <Mail
                    size={19}
                    aria-hidden="true"
                  />
  
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    placeholder="manager@medresponse.org"
                    value={formValues.email}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(
                      displayedEmailError,
                    )}
                  />
                </div>
  
                {displayedEmailError && (
                  <p className="login-form__error">
                    {displayedEmailError}
                  </p>
                )}
              </div>
  
              <div className="login-form__group">
                <div className="login-form__label-row">
                  <label htmlFor="password">
                    Password
                  </label>
  
                  <span>
                    Authorized personnel only
                  </span>
                </div>
  
                <div
                  className={`login-input ${
                    displayedPasswordError
                      ? "login-input--error"
                      : ""
                  }`}
                >
                  <LockKeyhole
                    size={19}
                    aria-hidden="true"
                  />
  
                  <input
                    id="password"
                    name="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={formValues.password}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(
                      displayedPasswordError,
                    )}
                  />
  
                  <button
                    className="login-input__action"
                    type="button"
                    disabled={isSubmitting}
                    onClick={() =>
                      setShowPassword(
                        (currentValue) =>
                          !currentValue,
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
  
                {displayedPasswordError && (
                  <p className="login-form__error">
                    {displayedPasswordError}
                  </p>
                )}
              </div>
  
              <label className="login-checkbox">
                <input
                  name="rememberMe"
                  type="checkbox"
                  checked={
                    formValues.rememberMe
                  }
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
  
                <span className="login-checkbox__control">
                  <CheckCircle2 size={14} />
                </span>
  
                <span>
                  Keep this device signed in
  
                  <small>
                    Use only on a trusted
                    workstation.
                  </small>
                </span>
              </label>
  
              <button
                className="login-submit"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle
                      size={19}
                      className="login-submit__spinner"
                    />
  
                    <span>
                      Verifying credentials...
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      Sign in to dashboard
                    </span>
  
                    <span
                      className="login-submit__arrow"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </>
                )}
              </button>
  
              {authenticationError && (
                <div
                  className="login-form__status login-form__status--error"
                  role="alert"
                >
                  <ShieldCheck size={18} />
  
                  <span>
                    {authenticationError}
                  </span>
                </div>
              )}
            </form>
  
            <div className="login-security-note">
              <ShieldCheck size={19} />
  
              <p>
                This portal is restricted to
                authorized health operations
                personnel. Activity will be
                securely logged for audit
                purposes.
              </p>
            </div>
          </div>
  
          <footer className="login-panel__footer">
            <span>MedResponse PoC</span>
  
            <span>
              Protected medical operations
              environment
            </span>
          </footer>
        </section>
      </main>
    );
  }
  
  export default LoginPage;