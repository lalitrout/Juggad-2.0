// TaskCard.jsx
import React, { useState } from 'react';
import { MapPin, Clock, Wallet, User, CheckCircle } from 'lucide-react';
import { getAuth } from 'firebase/auth';


// Format date/time (keeps it readable in both themes)
const fmt = (d) => {
  try {
    if (!d) return '—';
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
  } catch {
    return '—';
  }
};

const auth = getAuth();


const humanStatus = (s = 'open') =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const TaskCard = ({ task, navigateTo, theme, currentUserId, }) => {
  const isMineAsProvider = task?.acceptedBy?.uid === currentUserId;
  const isMineAsPoster = task?.postedBy === currentUserId;
  const [expanded, setExpanded] = useState(false);


  // Status pill (tuned for better contrast in dark mode)
  const statusPill = (() => {
    const base =
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    const light = {
      open: 'bg-gray-100 text-gray-800',
      assigned: 'bg-emerald-100 text-emerald-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-slate-100 text-slate-800',
      cancelled: 'bg-rose-100 text-rose-800',
    };
    const dark = {
      open: 'bg-gray-700 text-gray-100',
      assigned: 'bg-emerald-900/50 text-emerald-200',
      in_progress: 'bg-blue-900/50 text-blue-200',
      completed: 'bg-slate-800 text-slate-200',
      cancelled: 'bg-rose-900/50 text-rose-200',
    };
    const palette = theme === 'light' ? light : dark;
    const key = (task.status || 'open').toLowerCase();
    return `${base} ${palette[key] || (theme === 'light' ? light.open : dark.open)}`;
  })();

  const acceptedByName =
    task.acceptedBy?.name || task.acceptedByName || task.acceptedBy?.uid;

  return (
    <div
      className={[
        // Card surface + border tuned for consistent contrast in dark
        'rounded-xl shadow-md p-4 border transition-colors',
        theme === 'light'
          ? 'bg-white border-gray-100'
          : 'bg-gray-800 border-gray-700',
        // Set a predictable base text color; inner rows can override
        theme === 'light' ? 'text-gray-900' : 'text-gray-100',
      ].join(' ')}
    >
      {/* Title + Status */}
      <div className="flex items-start justify-between gap-3">
        <h3
          className={[
            'text-lg font-semibold leading-snug truncate',
            theme === 'light' ? 'text-gray-900' : 'text-white',
          ].join(' ')}
          title={task.title}
        >
          {task.title || 'Untitled task'}
        </h3>
        <span className={statusPill}>{humanStatus(task.status || 'open')}</span>
      </div>

      {/* Description */}
        <p
        className={[
          'mt-2 text-sm cursor-pointer transition-all',
          theme === 'light' ? 'text-gray-600' : 'text-gray-300',
          !expanded ? 'line-clamp-1' : '',
        ].join(' ')}
        onClick={() => setExpanded((prev) => !prev)}
        title={expanded ? 'Click to collapse' : 'Click to read more'}
      >
        {task.description}
      </p>

      {/* Meta */}
      <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
        <div className="flex items-center gap-2">
          <MapPin
            size={16}
            className={theme === 'light' ? 'text-gray-500' : 'text-gray-400'}
          />
          <span className={theme === 'light' ? 'text-gray-700' : 'text-gray-300'}>
            {task.location || '—'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Clock
            size={16}
            className={theme === 'light' ? 'text-gray-500' : 'text-gray-400'}
          />
          <span className={theme === 'light' ? 'text-gray-700' : 'text-gray-300'}>
            {task.duration ? task.duration : '—'}
            {task.deadline ? ` • Due: ${fmt(task.deadline)}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Wallet
            size={16}
            className={theme === 'light' ? 'text-gray-500' : 'text-gray-400'}
          />
          <span className={theme === 'light' ? 'text-gray-800' : 'text-gray-200'}>
            ₹{Number(task.budget || 0).toLocaleString('en-IN')}{' '}
            <span className={theme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
              {task.negotiable ? '(negotiable)' : ''}
            </span>
          </span>
        </div>
      </div>

      {/* Accepted/Provider section */}
      {task.acceptedBy?.uid && (
        <div
          className={[
            'mt-3 p-2 rounded-lg border',
            theme === 'light'
              ? 'border-emerald-100 bg-emerald-50/70'
              : 'border-emerald-900/40 bg-emerald-950/30',
          ].join(' ')}
        >
          <div className="flex items-center gap-2">
            <CheckCircle
              size={16}
              className={theme === 'light' ? 'text-emerald-700' : 'text-emerald-300'}
            />
            <span
              className={[
                'text-sm font-medium',
                theme === 'light' ? 'text-emerald-900' : 'text-emerald-200',
              ].join(' ')}
            >
              Accepted by {acceptedByName || 'Someone'}
            </span>
          </div>

          <div
            className={[
              'mt-1 flex items-center gap-2 text-xs',
              theme === 'light' ? 'text-gray-600' : 'text-gray-300',
            ].join(' ')}
          >
            <User size={14} className="opacity-80" />
            <span>
              {task.acceptedBy.uid === currentUserId
                ? 'You'
                : acceptedByName || task.acceptedBy.uid}
            </span>
            {task.acceptedBy.acceptedAt && <span>• {fmt(task.acceptedBy.acceptedAt)}</span>}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <div
          className={[
            'text-xs',
            theme === 'light' ? 'text-gray-500' : 'text-gray-400',
          ].join(' ')}
        >
          Updated: {fmt(task.updatedAt)}
        </div>

        <button
          onClick={() => navigateTo?.('task', { taskId: task.id })}
          className={[
            'text-sm font-medium rounded-lg px-3 py-1.5 transition focus:outline-none focus-visible:ring',
            theme === 'light'
              ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white hover:from-emerald-600 hover:to-blue-600 focus-visible:ring-emerald-400/40'
              : 'bg-gradient-to-r from-emerald-600 to-blue-600 text-white hover:from-emerald-700 hover:to-blue-700 focus-visible:ring-emerald-500/30',
          ].join(' ')}
        >
          View
        </button>
      </div>

      {/* Context badge */}
      <div className="mt-2">
        {isMineAsProvider && (
          <span className="inline-block text-[11px] ml-0 px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
            You accepted this
          </span>
        )}
      </div>
      <div className="mt-2">
        {isMineAsPoster && (
          <span className="inline-block text-[11px] ml-0 px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
            You posted this
          </span>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
