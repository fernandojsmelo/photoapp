import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { PhotoGrid } from "./components/PhotoGrid";
import { PhotoViewer } from "./components/PhotoViewer";
import { PhotoEditor } from "./components/PhotoEditor";
import { AlbumModal } from "./components/AlbumModal";
import { usePhotoStore } from "./store/usePhotoStore";
import type { LibraryView } from "./types/view";
import "./App.css";

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
  return albumName ?? "Álbum";
}

export default function App() {
  const {
    photos,
    albums,
    loading,
    init,
    importFiles,
    toggleFavorite,
    setTags,
    updateEdits,
    removePhoto,
    createAlbum,
    removeAlbum,
    togglePhotoInAlbum,
  } = usePhotoStore();

  const [view, setView] = useState<LibraryView>({ type: "all" });
  const [query, setQuery] = useState("");
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const scoped = useMemo(() => {
    if (view.type === "favorites") return photos.filter((p) => p.favorite);
    if (view.type === "album") return photos.filter((p) => p.albumIds.includes(view.albumId));
    return photos;
  }, [photos, view]);

  const filteredPhotos = useMemo(
    () => scoped.filter((photo) => matchesQuery(photo, query)),
    [scoped, query],
  );

  const selectedPhoto = photos.find((p) => p.id === selectedPhotoId) ?? null;
  const editingPhoto = photos.find((p) => p.id === editingPhotoId) ?? null;
  const currentAlbum = view.type === "album" ? albums.find((a) => a.id === view.albumId) : undefined;

  async function handleImport(files: FileList | File[]) {
    const result = await importFiles(files);
    const parts: string[] = [];
    if (result.imported > 0) parts.push(`${result.imported} foto(s) importada(s)`);
    if (result.duplicates > 0) parts.push(`${result.duplicates} duplicata(s) ignorada(s)`);
    setFeedback(parts.length > 0 ? parts.join(" · ") : "Nenhuma imagem válida selecionada");
  }

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
        }}
        onCreateAlbum={() => setShowAlbumModal(true)}
        onDeleteAlbum={(albumId) => {
          removeAlbum(albumId);
          if (view.type === "album" && view.albumId === albumId) setView({ type: "all" });
        }}
        photoCount={photos.length}
        favoriteCount={photos.filter((p) => p.favorite).length}
        albumPhotoCount={(albumId) => photos.filter((p) => p.albumIds.includes(albumId)).length}
      />

      <main className="main-column">
        <TopBar
          query={query}
          onQueryChange={setQuery}
          onImportFiles={handleImport}
          title={viewTitle(view, currentAlbum?.name)}
        />

        {feedback && <div className="toast">{feedback}</div>}

        {loading ? (
          <div className="empty-state">
            <p>Carregando biblioteca…</p>
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
    </div>
  );
}
