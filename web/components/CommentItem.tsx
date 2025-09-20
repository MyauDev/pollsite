"use client";

import { useState } from "react";
import type { Comment } from "@/components/Comments";
import Replies from "@/components/Replies";

export default function CommentItem({
  comment,
  onReply,
}: {
  comment: Comment;
  onReply?: () => void;
}) {
  const email = comment.author_email || "Аноним";
  const dateStr =
    new Date(comment.created_at).toLocaleString?.() ?? comment.created_at;

  const [showReplies, setShowReplies] = useState(false);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs opacity-80">{email}</div>
        <div className="text-[11px] opacity-60">{dateStr}</div>
      </div>

      <div className="mt-2 whitespace-pre-wrap text-sm">{comment.content}</div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReply}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
            title="Ответить на комментарий"
          >
            Ответить
          </button>

          <button
            type="button"
            onClick={() => setShowReplies((v) => !v)}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
          >
            {showReplies ? "Скрыть ответы" : "Показать ответы"}
          </button>
        </div>

        {typeof comment.replies_count === "number" && comment.replies_count > 0 ? (
          <div className="text-[11px] opacity-60">
            {comment.replies_count} ответ(ов)
          </div>
        ) : (
          <div className="text-[11px] opacity-40">нет ответов</div>
        )}
      </div>

      {showReplies && (
        <Replies pollId={comment.poll} parentId={comment.id} />
      )}
    </div>
  );
}