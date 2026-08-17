import { useEffect, useState } from "react";
import { MessageSquare, Pencil } from "lucide-react";

interface ItemCommentEditorProps {
  comment?: string;
  onSave: (comment: string) => void;
}

export function ItemCommentEditor({ comment = "", onSave }: ItemCommentEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment);
  useEffect(() => setDraft(comment), [comment]);

  if (!editing) {
    return (
      <div className={`item-comment ${comment ? "has-comment" : ""}`}>
        {comment && <p><span>My comment</span>{comment}</p>}
        <button type="button" className="comment-button" onClick={() => setEditing(true)}>
          {comment ? <Pencil size={12} /> : <MessageSquare size={12} />}{comment ? "Edit comment" : "Add comment"}
        </button>
      </div>
    );
  }

  return (
    <div className="comment-editor">
      <label className="field-label">My comment</label>
      <textarea autoFocus rows={3} maxLength={1000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add a quick note…" />
      <div><button type="button" className="text-button" onClick={() => { setDraft(comment); setEditing(false); }}>Cancel</button><button type="button" className="mini-button comment-save" onClick={() => { onSave(draft.trim()); setEditing(false); }}>Save comment</button></div>
    </div>
  );
}
