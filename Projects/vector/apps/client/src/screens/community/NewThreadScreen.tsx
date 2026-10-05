import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  FORUM_TITLE_MAX,
  type ForumCategoryList,
  type ForumPosting,
  type ResultSummary,
} from '@vector/shared';
import { ApiRequestError } from '../../api/api-client';
import { createThread, getCategory, getCommunity, threadPath } from '../../api/community-api';
import { getPilotResults } from '../../api/results-api';
import { useAuth } from '../../auth/auth-store';
import { formatDate } from '../../format/dates';
import { usePageMeta } from '../../site/page-meta';
import { airspaceLabel, difficultyLabel } from '../pilots/pilot-format';
import { formatRp } from '../scope/score-format';
import { failure } from './community-format';
import { Composer, PostingNotice } from './CommunityParts';
import './community.css';

/** Starting a thread, optionally with one of your sessions on it. */
export function NewThreadScreen() {
  usePageMeta({ title: 'New thread · Community' });
  const { category: initialCategory = 'general' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const handle = auth.status === 'signedIn' ? auth.user.handle : undefined;
  const isAdmin = auth.status === 'signedIn' && auth.user.role === 'admin';

  const [categories, setCategories] = useState<ForumCategoryList['categories']>([]);
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [posting, setPosting] = useState<ForumPosting | undefined>(undefined);
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [resultId, setResultId] = useState(params.get('result') ?? '');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCommunity()
      .then((loaded) => !cancelled && setCategories(loaded.categories))
      .catch(() => undefined);
    if (handle)
      getPilotResults(handle, 0)
        .then((page) => !cancelled && setResults(page.results.slice(0, 20)))
        .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [handle]);

  // Whether they can post in this category (it says why not).
  useEffect(() => {
    let cancelled = false;
    getCategory(categoryId)
      .then((loaded) => !cancelled && setPosting(loaded.posting))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setFields({});
    try {
      const created = await createThread({
        categoryId,
        title,
        body,
        ...(resultId ? { resultId } : {}),
      });
      void navigate(threadPath(created));
    } catch (caught) {
      setFields(caught instanceof ApiRequestError ? caught.fields : {});
      setError(failure(caught));
      setBusy(false);
    }
  };

  const choosable = categories.filter((category) => isAdmin || !category.adminOnly);

  return (
    <div className="site-page forum-page forum-page--narrow">
      <p className="forum-crumbs">
        <Link to="/community">Community</Link>
        {' › '}
        <Link to={`/community/${categoryId}`}>
          {categories.find((c) => c.id === categoryId)?.name ?? 'Category'}
        </Link>
      </p>
      <h1>New thread</h1>
      {posting && <PostingNotice posting={posting} next={`/community/${categoryId}/new`} />}
      <form className="forum-form" onSubmit={(event) => void submit(event)} aria-label="New thread">
        <label className="forum-field">
          <span>Category</span>
          <select
            className="forum-input"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {(choosable.length ? choosable : [{ id: categoryId, name: categoryId }]).map(
              (category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="forum-field">
          <span>Title</span>
          <input
            className="forum-input"
            maxLength={FORUM_TITLE_MAX}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          {fields.title && <span className="forum-field__error">{fields.title}</span>}
        </label>
        <div className="forum-field">
          <span>Post</span>
          <Composer
            label="Post"
            value={body}
            onChange={setBody}
            rows={12}
            newPoster={posting?.allowed ? posting.newPoster : false}
            placeholder="What would you like to talk about?"
          />
          {fields.body && <span className="forum-field__error">{fields.body}</span>}
        </div>
        {results.length > 0 && (
          <label className="forum-field">
            <span>Share a session (optional)</span>
            <select
              className="forum-input"
              value={resultId}
              onChange={(event) => setResultId(event.target.value)}
            >
              <option value="">None</option>
              {results.map((result) => (
                <option key={result.id} value={result.id}>
                  {airspaceLabel(result.airspaceId)} · {difficultyLabel(result.difficulty)} ·{' '}
                  {formatRp(result.rp)} RP · {formatDate(result.playedAt)}
                </option>
              ))}
            </select>
            {fields.resultId && <span className="forum-field__error">{fields.resultId}</span>}
          </label>
        )}
        {error && (
          <p className="forum-error" role="alert">
            {error}
          </p>
        )}
        <div className="forum-form__actions">
          <Link to={`/community/${categoryId}`} className="site-button">
            Cancel
          </Link>
          <button
            type="submit"
            className="site-button site-button--primary"
            disabled={busy || !title.trim() || !body.trim() || posting?.allowed === false}
          >
            {busy ? 'Posting…' : 'Post thread'}
          </button>
        </div>
      </form>
    </div>
  );
}
