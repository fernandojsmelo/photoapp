import { useEffect, useMemo, useState } from "react";
import { listOwnedPhotoSharesApi, photoThumbnailUrl, revokePhotoSharesApi } from "../api/client";
import type { OwnedPhotoShare } from "../types/photo";

interface Props {
  onClose: () => void;
}

function entryKey(photoId: string, userId: string): string {
  return `${photoId}:${userId}`;
}

export function ManageSharesModal({ onClose }: Props) {
  const [shares, setShares] = useState<OwnedPhotoShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    listOwnedPhotoSharesApi()
      .then(({ shares }) => setShares(shares))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, { userId: string; username: string; entries: OwnedPhotoShare[] }>();
    for (const share of shares) {
      const group = map.get(share.userId) ?? { userId: share.userId, username: share.username, entries: [] };
      group.entries.push(share);
      map.set(share.userId, group);
    }
    return [...map.values()].sort((a, b) => a.username.localeCompare(b.username));
  }, [shares]);

  function toggle(photoId: string, userId: string) {
    setSelected((prev) => {
      const key = entryKey(photoId, userId);
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleGroup(group: { userId: string; entries: OwnedPhotoShare[] }) {
    const keys = group.entries.map((e) => entryKey(e.photoId, e.userId));
    const allSelected = keys.every((k) => selected.has(k));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const key of keys) {
        if (allSelected) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  }

  async function revokeEntries(entries: Array<{ photoId: string; userId: string }>) {
    setRevoking(true);
    try {
      await revokePhotoSharesApi(entries);
      const revokedKeys = new Set(entries.map((e) => entryKey(e.photoId, e.userId)));
      setShares((prev) => prev.filter((s) => !revokedKeys.has(entryKey(s.photoId, s.userId))));
      setSelected((prev) => {
        const next = new Set(prev);
        for (const key of revokedKeys) next.delete(key);
        return next;
      });
    } finally {
      setRevoking(false);
    }
  }

  const selectedCount = selected.size;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal users-modal" onClick={(e) => e.stopPropagation()}>
        <div className="viewer-header">
          <h2 className="truncate">Gerenciar compartilhamentos avulsos</h2>
          <button className="icon-button" onClick={onClose} title="Fechar">
            ×
          </button>
        </div>

        <p className="muted small">
          Fotos que você compartilhou sem vínculo de álbum, agrupadas por quem recebeu.
        </p>

        {loading ? (
          <p className="muted small">Carregando…</p>
        ) : groups.length === 0 ? (
          <p className="muted small">Você ainda não compartilhou nenhuma foto avulsa.</p>
        ) : (
          <>
            {selectedCount > 0 && (
              <div className="bulk-bar" style={{ marginBottom: 12 }}>
                <strong>{selectedCount} selecionada(s)</strong>
                <span className="spacer" />
                <button
                  className="danger-button"
                  disabled={revoking}
                  onClick={() =>
                    revokeEntries(
                      [...selected].map((key) => {
                        const [photoId, userId] = key.split(":");
                        return { photoId, userId };
                      }),
                    )
                  }
                >
                  {revoking ? "Removendo…" : "Remover selecionadas"}
                </button>
              </div>
            )}

            <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
              {groups.map((group) => {
                const keys = group.entries.map((e) => entryKey(e.photoId, e.userId));
                const allSelected = keys.every((k) => selected.has(k));
                return (
                  <section key={group.userId} className="viewer-section">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3>
                        {group.username}{" "}
                        <span className="muted tiny">
                          ({group.entries.length} foto{group.entries.length === 1 ? "" : "s"})
                        </span>
                      </h3>
                      <div>
                        <button className="ghost-button" onClick={() => toggleGroup(group)}>
                          {allSelected ? "Desmarcar todas" : "Selecionar todas"}
                        </button>
                        <button
                          className="danger-link"
                          disabled={revoking}
                          onClick={() =>
                            revokeEntries(group.entries.map((e) => ({ photoId: e.photoId, userId: e.userId })))
                          }
                        >
                          Remover todas
                        </button>
                      </div>
                    </div>
                    <div className="album-checklist">
                      {group.entries.map((entry) => (
                        <label key={entry.photoId} className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={selected.has(entryKey(entry.photoId, entry.userId))}
                            onChange={() => toggle(entry.photoId, entry.userId)}
                          />
                          <img
                            src={photoThumbnailUrl(entry.photoId)}
                            alt=""
                            style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4, marginRight: 8 }}
                          />
                          {entry.fileName}
                        </label>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}

        <div className="modal-actions">
          <button className="primary-button" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
