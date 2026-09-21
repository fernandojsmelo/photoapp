import { useEffect, useState } from "react";
import { createUserApi, deleteUserApi, listUsersApi, type AuthUser } from "../api/client";

interface Props {
  currentUserId: string;
  onClose: () => void;
}

export function UsersModal({ currentUserId, onClose }: Props) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    listUsersApi()
      .then(({ users }) => setUsers(users))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setCreating(true);
    try {
      const { user } = await createUserApi(username.trim(), password);
      setUsers((prev) => [...prev, user]);
      setUsername("");
      setPassword("");
    } catch {
      setError("Não foi possível criar o usuário (nome já em uso?).");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteUserApi(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  const adminCount = users.filter((u) => u.isAdmin).length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal users-modal" onClick={(e) => e.stopPropagation()}>
        <div className="viewer-header">
          <h2>Usuários deste servidor</h2>
          <button className="icon-button" onClick={onClose} title="Fechar">
            ×
          </button>
        </div>

        <p className="muted small">
          Crie uma conta para cada pessoa que vai usar o PhotoApp. Cada uma vê só as
          próprias fotos e álbuns. Compartilhe usuário e senha diretamente com a pessoa.
        </p>

        {loading ? (
          <p className="muted small">Carregando…</p>
        ) : (
          <ul className="users-list">
            {users.map((u) => (
              <li key={u.id} className="users-list-item">
                <span className="truncate">{u.username}</span>
                {u.isAdmin && <span className="tag-pill">admin</span>}
                {u.id === currentUserId && <span className="muted tiny">(você)</span>}
                {u.id !== currentUserId && !(u.isAdmin && adminCount <= 1) && (
                  <button className="danger-link" onClick={() => handleDelete(u.id)}>
                    Remover
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <form className="users-create-form" onSubmit={handleCreate}>
          <h3 className="viewer-section-title">Criar novo usuário</h3>
          <input
            type="text"
            placeholder="Nome de usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
          />
          <input
            type="password"
            placeholder="Senha (mín. 8 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          {error && <p className="auth-error">{error}</p>}
          <button className="primary-button" type="submit" disabled={creating}>
            {creating ? "Criando…" : "Criar usuário"}
          </button>
        </form>
      </div>
    </div>
  );
}
