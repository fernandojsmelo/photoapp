export type LibraryView =
  | { type: "all" }
  | { type: "favorites" }
  | { type: "album"; albumId: string };

export function viewKey(view: LibraryView): string {
  return view.type === "album" ? `album:${view.albumId}` : view.type;
}
