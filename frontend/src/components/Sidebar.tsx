import type { AlbumRecord } from "../types/photo";
import { viewKey, type LibraryView } from "../types/view";

interface Props {
  albums: AlbumRecord[];
  currentView: LibraryView;
  onChangeView: (view: LibraryView) => void;
  onCreateAlbum: () => void;
  onDeleteAlbum: (albumId: string) => void;
  photoCount: number;
  favoriteCount: number;
  albumPhotoCount: (albumId: string) => number;
}

export function Sidebar({
  albums,
  currentView,
  onChangeView,
  onCreateAlbum,
  onDeleteAlbum,
  photoCount,
  favoriteCount,
  albumPhotoCount,
}: Props) {
  const activeKey = viewKey(currentView);

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-icon">◈</span>
        <span className="brand-name">PhotoApp</span>
      </div>

      <nav className="nav-section">
        <button
          className={`nav-item ${activeKey === "all" ? "active" : ""}`}
          onClick={() => onChangeView({ type: "all" })}
        >
          <span>Biblioteca</span>
          <span className="count">{photoCount}</span>
        </button>
        <button
          className={`nav-item ${activeKey === "favorites" ? "active" : ""}`}
          onClick={() => onChangeView({ type: "favorites" })}
        >
          <span>★ Favoritos</span>
          <span className="count">{favoriteCount}</span>
        </button>
      </nav>

      <div className="nav-section">
        <div className="nav-heading">
          <span>Álbuns</span>
          <button className="icon-button" onClick={onCreateAlbum} title="Criar álbum">
            +
          </button>
        </div>
        {albums.length === 0 && <p className="muted small">Nenhum álbum ainda</p>}
        {albums.map((album) => (
          <div
            key={album.id}
            className={`nav-item album-item ${
              activeKey === `album:${album.id}` ? "active" : ""
            }`}
          >
            <button
              className="nav-item-main"
              onClick={() => onChangeView({ type: "album", albumId: album.id })}
            >
              <span className="truncate">{album.name}</span>
              <span className="count">{albumPhotoCount(album.id)}</span>
            </button>
            <button
              className="icon-button subtle"
              title="Excluir álbum"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteAlbum(album.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
