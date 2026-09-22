import { useState } from "react";
import { login, setupAccount, type AuthUser } from "../api/client";

interface Props {
  mode: "setup" | "login";
  onAuthenticated: (user: AuthUser) => void;
}

export function AuthScreen({ mode, onAuthenticated }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "setup" && password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const { user } = mode === "setup" ? await setupAccount(username, password) : await login(username, password);
      onAuthenticated(user);
    } catch {
      setError(
        mode === "setup"
          ? "Não foi possível criar a conta. Verifique os dados e tente novamente."
          : "Usuário ou senha inválidos.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={handleSubmit} autoComplete="off">
        <div className="brand" style={{ justifyContent: "center", paddingBottom: 8 }}>
          <span className="brand-icon">◈</span>
          <span className="brand-name">PhotoApp</span>
        </div>
        <h1 className="auth-title">
          {mode === "setup" ? "Criar sua conta" : "Entrar"}
        </h1>
        <p className="muted small" style={{ textAlign: "center", marginBottom: 8 }}>
          {mode === "setup"
            ? "Primeira execução: crie o único usuário deste servidor self-hosted."
            : "Entre com o usuário e senha configurados neste servidor."}
        </p>

        <label className="auth-field">
          <span>Usuário</span>
          <input
            type="text"
            name={mode === "setup" ? "new-account-username" : "username"}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete={mode === "setup" ? "off" : "username"}
            autoFocus
            required
            minLength={3}
          />
        </label>

        <label className="auth-field">
          <span>Senha</span>
          <input
            type="password"
            name={mode === "setup" ? "new-account-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "setup" ? "new-password" : "current-password"}
            required
            minLength={8}
          />
        </label>

        {mode === "setup" && (
          <label className="auth-field">
            <span>Confirmar senha</span>
            <input
              type="password"
              name="new-account-password-confirm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </label>
        )}

        {error && <p className="auth-error">{error}</p>}

        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? "Aguarde…" : mode === "setup" ? "Criar conta" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
