export type LibraryView =
  | { type: "all" }
  | { type: "favorites" }
  | { type: "album"; albumId: string }
  | { type: "tag"; tag: string }
  | { type: "sharedPhotos" };

export function viewKey(view: LibraryView): string {
  if (view.type === "album") return `album:${view.albumId}`;
  if (view.type === "tag") return `tag:${view.tag}`;
  return view.type;
}
