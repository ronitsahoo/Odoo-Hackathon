import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowBigUp, ArrowBigDown, CheckCircle2, Trash2, Pencil, Send, MessageSquare,
} from 'lucide-react';
import api, { apiError } from '../api/axios.js';
import { useAuthStore } from '../store/authStore.js';
import { useRequestStore } from '../store/requestStore.js';
import { useSocket, useItemRoom } from '../hooks/useSocket.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import Textarea from '../components/ui/Textarea.jsx';
import Loader from '../components/ui/Loader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import RichTextEditor from '../components/RichTextEditor.jsx';

/**
 * Item detail: the item, a live threaded comment section (vote + accept), the
 * item vote control, and a "send request" flow. Joins the item's socket room so
 * new comments and item updates appear in real time across tabs.
 */
export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuthStore();
  const createRequest = useRequestStore((s) => s.createRequest);

  const [item, setItem] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [commentBody, setCommentBody] = useState('');
  const [posting, setPosting] = useState(false);

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestMsg, setRequestMsg] = useState('');
  const [sending, setSending] = useState(false);

  useItemRoom(id); // join room for live comments/updates

  // Load item + comments.
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [itemRes, commentsRes] = await Promise.all([
          api.get(`/items/${id}`),
          api.get(`/items/${id}/comments`),
        ]);
        if (!active) return;
        setItem(itemRes.data.data.item);
        setComments(commentsRes.data.data.comments);
      } catch (err) {
        if (active) setError(apiError(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  // Live: item changes (votes, moderation) + new/updated comments.
  useSocket('item:updated', (updated) => {
    if (updated._id === id) setItem(updated);
  });
  useSocket('comment:created', (c) => {
    if (c.item === id) setComments((prev) => [...prev, c]);
  });
  useSocket('comment:updated', (c) => {
    if (c.deleted) return setComments((prev) => prev.filter((x) => x._id !== c._id));
    setComments((prev) => {
      const others = prev.map((x) => (x._id === c._id ? c : x));
      // Re-sort so a freshly accepted answer floats to the top.
      return [...others].sort((a, b) => Number(b.isAccepted) - Number(a.isAccepted));
    });
  });

  const isOwner = user && item && item.owner?._id === user._id;
  const myVote = item
    ? item.upvotes?.some((v) => v === user?._id || v?._id === user?._id)
      ? 1
      : item.downvotes?.some((v) => v === user?._id || v?._id === user?._id)
      ? -1
      : 0
    : 0;

  async function vote(value) {
    if (!user) return toast.error('Log in to vote');
    try {
      const { data } = await api.post(`/items/${id}/vote`, { value });
      setItem(data.data.item);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function postComment(e) {
    e.preventDefault();
    if (!commentBody || commentBody === '<p><br></p>') return toast.error('Write something first');
    setPosting(true);
    try {
      await api.post(`/items/${id}/comments`, { body: commentBody });
      setCommentBody('');
      toast.success('Reply posted');
      // The socket event appends it; no manual insert needed.
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setPosting(false);
    }
  }

  async function voteComment(commentId) {
    if (!user) return toast.error('Log in to vote');
    try {
      await api.post(`/comments/${commentId}/vote`, { value: 1 });
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function acceptComment(commentId) {
    try {
      await api.patch(`/comments/${commentId}/accept`);
      toast.success('Answer accepted');
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function deleteComment(commentId) {
    try {
      await api.delete(`/comments/${commentId}`);
      toast.success('Comment deleted');
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function deleteItem() {
    if (!confirm('Delete this item?')) return;
    try {
      await api.delete(`/items/${id}`);
      toast.success('Item deleted');
      navigate('/dashboard');
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function sendRequest() {
    setSending(true);
    try {
      await createRequest({ itemId: id, message: requestMsg });
      toast.success('Request sent to the owner');
      setRequestOpen(false);
      setRequestMsg('');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSending(false);
    }
  }

  if (loading) return <Loader label="Loading item…" />;
  if (error) return <Card>Couldn't load this item: {error}</Card>;
  if (!item) return null;

  const score = (item.upvotes?.length || 0) - (item.downvotes?.length || 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Item header */}
      <Card>
        <div className="flex gap-4">
          {/* Vote rail */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => vote(1)}
              className={`rounded-lg p-1 hover:bg-slate-100 ${myVote === 1 ? 'text-brand-600' : 'text-slate-400'}`}
            >
              <ArrowBigUp size={26} />
            </button>
            <span className="font-semibold text-slate-700">{score}</span>
            <button
              onClick={() => vote(-1)}
              className={`rounded-lg p-1 hover:bg-slate-100 ${myVote === -1 ? 'text-red-500' : 'text-slate-400'}`}
            >
              <ArrowBigDown size={26} />
            </button>
          </div>

          <div className="flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {item.category}
              </span>
              <StatusBadge status={item.status} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{item.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              by {item.owner?.name} · {new Date(item.createdAt).toLocaleDateString()}
            </p>

            {item.images?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.images.map((src) => (
                  <img key={src} src={src} alt="" className="h-32 w-32 rounded-lg object-cover" />
                ))}
              </div>
            )}

            <div
              className="prose-content mt-3 text-slate-700"
              dangerouslySetInnerHTML={{ __html: item.description }}
            />

            {item.tags?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {item.tags.map((t) => (
                  <span key={t} className="rounded bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              {user && !isOwner && (
                <Button onClick={() => setRequestOpen(true)}>
                  <Send size={16} /> Send request
                </Button>
              )}
              {(isOwner || isAdmin()) && (
                <>
                  <Link to={`/items/${id}/edit`} className="inline-flex">
                    <Button variant="secondary">
                      <Pencil size={16} /> Edit
                    </Button>
                  </Link>
                  <Button variant="danger" onClick={deleteItem}>
                    <Trash2 size={16} /> Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Comments / answers */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <MessageSquare size={18} /> {comments.length} Responses
        </h2>

        <div className="space-y-3">
          {comments.map((c) => (
            <Card key={c._id} className={c.isAccepted ? 'border-emerald-200 bg-emerald-50/40' : ''}>
              <div className="flex gap-3">
                <button
                  onClick={() => voteComment(c._id)}
                  className="flex flex-col items-center text-slate-400 hover:text-brand-600"
                >
                  <ArrowBigUp size={20} />
                  <span className="text-xs font-medium">{c.upvotes?.length || 0}</span>
                </button>
                <div className="flex-1">
                  {c.isAccepted && (
                    <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <CheckCircle2 size={14} /> Accepted answer
                    </span>
                  )}
                  <div
                    className="prose-content text-sm text-slate-700"
                    dangerouslySetInnerHTML={{ __html: c.body }}
                  />
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                    <span>{c.author?.name}</span>
                    <span>{new Date(c.createdAt).toLocaleString()}</span>
                    {isOwner && !c.isAccepted && (
                      <button
                        onClick={() => acceptComment(c._id)}
                        className="text-emerald-600 hover:underline"
                      >
                        Accept
                      </button>
                    )}
                    {(user?._id === c.author?._id || isAdmin()) && (
                      <button onClick={() => deleteComment(c._id)} className="text-red-500 hover:underline">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {comments.length === 0 && (
            <Card className="text-center text-sm text-slate-400">No responses yet.</Card>
          )}
        </div>

        {/* New comment */}
        {user ? (
          <Card className="mt-4">
            <form onSubmit={postComment} className="space-y-3">
              <RichTextEditor
                label="Your response"
                value={commentBody}
                onChange={setCommentBody}
                placeholder="Write a reply or answer…"
              />
              <div className="flex justify-end">
                <Button type="submit" loading={posting}>
                  Post response
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Card className="mt-4 text-center text-sm text-slate-500">
            <Link to="/login" className="text-brand-600 hover:underline">
              Log in
            </Link>{' '}
            to respond.
          </Card>
        )}
      </div>

      {/* Send request modal */}
      <Modal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Send a request"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRequestOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendRequest} loading={sending}>
              Send
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-500">
          This notifies <span className="font-medium">{item.owner?.name}</span> in real time. Maps
          to a swap / booking / assignment / approval depending on your theme.
        </p>
        <Textarea
          label="Message (optional)"
          value={requestMsg}
          onChange={(e) => setRequestMsg(e.target.value)}
          placeholder="Add a note for the owner…"
        />
      </Modal>
    </div>
  );
}
