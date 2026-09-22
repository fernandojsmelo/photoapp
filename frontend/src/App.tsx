import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { PhotoGrid } from "./components/PhotoGrid";
import { PhotoViewer } from "./components/PhotoViewer";
import { PhotoEditor } from "./components/PhotoEditor";
import { AlbumModal } from "./components/AlbumModal";
import { BulkActionBar } from "./components/BulkActionBar";
import { AuthScreen } from "./components/AuthScreen";
import { UsersModal } from "./components/UsersModal";
import { ShareAlbumModal } from "./components/ShareAlbumModal";
import { ManageSharesModal } from "./components/ManageSharesModal";
import { getAuthStatus, getMe, logout, searchPhotosSemantic, type AuthUser } from "./api/client";
import { usePhotoStore } from "./store/usePhotoStore";
import type { LibraryView } from "./types/view";
import type { AlbumRecord, PhotoRecord } from "./types/photo";
import "./App.css";

type AuthState =
  | { status: "checking" }
  | { status: "needs-setup" }
  | { status: "needs-login" }
  | { status: "ready"; user: AuthUser };

function matchesQuery(photo: { fileName: string; tags: string[] }, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return (
    photo.fileName.toLowerCase().includes(q) || photo.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}

function viewTitle(view: LibraryView, albumName?: string): string {
  if (view.type === "all") return "Biblioteca";
  if (view.type === "favorites") return "Favoritos";
  if (view.type === "tag") return `Tag: ${view.tag}`;
  if (view.type === "sharedPhotos") return "Fotos compartilhadas comigo";
  return albumName ?? "Álbum";
}

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ status: "checking" });

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const { hasUser } = await getAuthStatus();
      if (cancelled) return;
      if (!hasUser) {
        setAuth({ status: "needs-setup" });
        return;
      }
      try {
        const { user } = await getMe();
        if (!cancelled) setAuth({ status: "ready", user });
      } catch {
        if (!cancelled) setAuth({ status: "needs-login" });
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (auth.status === "checking") {
    return (
      <div className="auth-shell">
        <p className="muted">Conectando ao servidor…</p>
      </div>
    );
  }

  if (auth.status === "needs-setup" || auth.status === "needs-login") {
    return (
      <AuthScreen
        mode={auth.status === "needs-setup" ? "setup" : "login"}
        onAuthenticated={(user) => setAuth({ status: "ready", user })}
      />
    );
  }

  return (
    <PhotoLibrary
      user={auth.user}
      onLogout={() => setAuth({ status: "needs-login" })}
    />
  );
}

function PhotoLibrary({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const {
    photos,
    albums,
    sharedPhotos,
    loading,
    init,
    reset,
    importFiles,
    toggleFavorite,
    setTags,
    updateEdits,
    removePhoto,
    createAlbum,
    removeAlbum,
    togglePhotoInAlbum,
    addPhotosToAlbum,
    addTagToPhotos,
    setFavoriteMany,
    removePhotosMany,
    fetchAlbumPhotos,
    refreshSharedPhotos,
    sharePhotosMany,
  } = usePhotoStore();

  const [view, setView] = useState<LibraryView>({ type: "all" });
  const [query, setQuery] = useState("");
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showManageSharesModal, setShowManageSharesModal] = useState(false);
  const [shareAlbumTarget, setShareAlbumTarget] = useState<AlbumRecord | null>(null);
  const [albumViewPhotos, setAlbumViewPhotos] = useState<PhotoRecord[] | null>(null);
  const [albumViewLoading, setAlbumViewLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [semanticQuery, setSemanticQuery] = useState<string | null>(null);
  const [semanticResults, setSemanticResults] = useState<PhotoRecord[] | null>(null);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [semanticError, setSemanticError] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  async function handleLogout() {
    await logout();
    reset();
    onLogout();
  }

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (view.type !== "album") {
      setAlbumViewPhotos(null);
      return;
    }
    let cancelled = false;
    setAlbumViewLoading(true);
    fetchAlbumPhotos(view.albumId).then((result) => {
      if (!cancelled) {
        setAlbumViewPhotos(result);
        setAlbumViewLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.type === "album" ? view.albumId : null]);

  useEffect(() => {
    if (view.type === "sharedPhotos") refreshSharedPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.type]);

  const scoped = useMemo(() => {
    if (view.type === "favorites") return photos.filter((p) => p.favorite);
    if (view.type === "album") return albumViewPhotos ?? [];
    if (view.type === "tag") return photos.filter((p) => p.tags.includes(view.tag));
    if (view.type === "sharedPhotos") return sharedPhotos;
    return photos;
  }, [photos, view, albumViewPhotos, sharedPhotos]);

  const filteredPhotos = useMemo(() => {
    if (semanticResults) {
      const scopedIds = new Set(scoped.map((p) => p.id));
      return semanticResults.filter((p) => scopedIds.has(p.id));
    }
    return scoped.filter((photo) => matchesQuery(photo, query));
  }, [scoped, query, semanticResults]);

  function clearSemanticSearch() {
    setSemanticQuery(null);
    setSemanticResults(null);
    setSemanticError(false);
  }

  async function handleSemanticSearch(rawQuery: string) {
    const trimmed = rawQuery.trim();
    if (!trimmed) return;
    setSemanticLoading(true);
    setSemanticError(false);
    try {
      const { photos: results } = await searchPhotosSemantic(trimmed);
      setSemanticQuery(trimmed);
      setSemanticResults(results);
    } catch {
      setSemanticError(true);
    } finally {
      setSemanticLoading(false);
    }
  }

  const allTags = useMemo(() => {
    const set = new Set<string>();
    photos.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [photos]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    photos.forEach((p) => p.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [photos]);

  const selectedPhoto =
    filteredPhotos.find((p) => p.id === selectedPhotoId) ??
    photos.find((p) => p.id === selectedPhotoId) ??
    null;
  const editingPhoto = photos.find((p) => p.id === editingPhotoId) ?? null;
  const currentAlbum = view.type === "album" ? albums.find((a) => a.id === view.albumId) : undefined;
  const isReadOnlyAlbumView = currentAlbum ? !currentAlbum.isOwner : false;
  const isReadOnlyView = isReadOnlyAlbumView || view.type === "sharedPhotos";

  useEffect(() => {
    if (isReadOnlyView) exitSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReadOnlyView]);

  async function handleImport(files: FileList | File[]) {
    const result = await importFiles(files);
    const parts: string[] = [];
    if (result.imported > 0) parts.push(`${result.imported} foto(s) importada(s)`);
    if (result.duplicates > 0) parts.push(`${result.duplicates} duplicata(s) ignorada(s)`);
    setFeedback(parts.length > 0 ? parts.join(" · ") : "Nenhuma imagem válida selecionada");
  }

  function exitSelection() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function toggleSelect(photoId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  const selectedIdList = [...selectedIds];

  return (
    <div
      className={`app-shell ${isDragging ? "dragging" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) handleImport(e.dataTransfer.files);
      }}
    >
      <Sidebar
        albums={albums}
        currentView={view}
        onChangeView={(next) => {
          setView(next);
          setQuery("");
          clearSemanticSearch();
        }}
        onCreateAlbum={() => setShowAlbumModal(true)}
        onDeleteAlbum={(albumId) => {
          removeAlbum(albumId);
          if (view.type === "album" && view.albumId === albumId) setView({ type: "all" });
        }}
        photoCount={photos.length}
        favoriteCount={photos.filter((p) => p.favorite).length}
        sharedPhotosCount={sharedPhotos.length}
        albumPhotoCount={(albumId) => photos.filter((p) => p.albumIds.includes(albumId)).length}
        tagCounts={tagCounts}
        username={user.username}
        isAdmin={user.isAdmin}
        onLogout={handleLogout}
        onManageUsers={() => setShowUsersModal(true)}
        onManageShares={() => setShowManageSharesModal(true)}
        onShareAlbum={setShareAlbumTarget}
      />

      <main className="main-column">
        <TopBar
          query={query}
          onQueryChange={(next) => {
            setQuery(next);
            if (!next.trim() && semanticResults) clearSemanticSearch();
          }}
          onSearchSubmit={handleSemanticSearch}
          searchingAi={semanticLoading}
          onImportFiles={handleImport}
          title={viewTitle(view, currentAlbum?.name)}
          selectionMode={selectionMode}
          onToggleSelectionMode={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
          selectionDisabled={isReadOnlyView}
        />

        {feedback && <div className="toast">{feedback}</div>}

        {semanticQuery && (
          <div className="toast ai-toast">
            <span>✨ Resultados por IA para "{semanticQuery}" ({filteredPhotos.length})</span>
            <button className="ghost-button" onClick={clearSemanticSearch}>
              Limpar
            </button>
          </div>
        )}
        {semanticError && (
          <div className="toast">Busca por IA indisponível no momento — tente de novo em instantes.</div>
        )}

        {selectionMode && selectedIds.size > 0 && (
          <BulkActionBar
            count={selectedIds.size}
            albums={albums}
            onAddToAlbum={(albumId) => addPhotosToAlbum(selectedIdList, albumId)}
            onCreateAlbumAndAdd={async (name) => {
              const album = await createAlbum(name);
              await addPhotosToAlbum(selectedIdList, album.id);
            }}
            onAddTag={(tag) => addTagToPhotos(selectedIdList, tag)}
            onFavorite={() => setFavoriteMany(selectedIdList)}
            onDelete={() => {
              removePhotosMany(selectedIdList);
              exitSelection();
            }}
            onSharePhotos={async (username) => {
              try {
                await sharePhotosMany(selectedIdList, username);
                setFeedback(`${selectedIdList.length} foto(s) compartilhada(s) com ${username}`);
              } catch {
                setFeedback(`Não foi possível compartilhar com "${username}"`);
              }
            }}
            onCancel={exitSelection}
          />
        )}

        {loading || (view.type === "album" && albumViewLoading) ? (
          <div className="empty-state">
            <p>Carregando…</p>
          </div>
        ) : (
          <PhotoGrid
            photos={filteredPhotos}
            onSelect={setSelectedPhotoId}
            emptyMessage={
              photos.length === 0
                ? "Sua biblioteca está vazia. Arraste fotos aqui ou clique em Importar."
                : "Nenhuma foto encontrada com esse filtro."
            }
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        )}

        {isDragging && (
          <div className="drop-overlay">
            <p>Solte para importar</p>
          </div>
        )}
      </main>

      {selectedPhoto && (
        <PhotoViewer
          photo={selectedPhoto}
          albums={albums}
          allTags={allTags}
          onClose={() => setSelectedPhotoId(null)}
          onToggleFavorite={() => toggleFavorite(selectedPhoto.id)}
          onSetTags={(tags) => setTags(selectedPhoto.id, tags)}
          onToggleAlbum={(albumId) => togglePhotoInAlbum(selectedPhoto.id, albumId)}
          onDelete={() => {
            removePhoto(selectedPhoto.id);
            setSelectedPhotoId(null);
          }}
          onOpenEditor={() => {
            setEditingPhotoId(selectedPhoto.id);
          }}
        />
      )}

      {editingPhoto && (
        <PhotoEditor
          photo={editingPhoto}
          onClose={() => setEditingPhotoId(null)}
          onSave={(edits) => updateEdits(editingPhoto.id, edits)}
        />
      )}

      {showAlbumModal && (
        <AlbumModal
          onClose={() => setShowAlbumModal(false)}
          onCreate={async (name) => {
            await createAlbum(name);
            setShowAlbumModal(false);
          }}
        />
      )}

      {showUsersModal && (
        <UsersModal currentUserId={user.id} onClose={() => setShowUsersModal(false)} />
      )}

      {showManageSharesModal && (
        <ManageSharesModal onClose={() => setShowManageSharesModal(false)} />
      )}

      {shareAlbumTarget && (
        <ShareAlbumModal
          album={shareAlbumTarget}
          albumPhotos={photos.filter((p) => p.albumIds.includes(shareAlbumTarget.id))}
          onClose={() => setShareAlbumTarget(null)}
        />
      )}
    </div>
  );
}
