import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

// Define types
export interface Session {
  id?: number;
  created_at: string;
  duration: number;
  approval_state: 'draft' | 'submitted' | 'approved' | 'rejected';
  session_status: 'passive' | 'tasked';
  task_id: number | null;
  reward_id: number | null;
}

interface Task {
  id: number;
  title: string;
  description: string[];
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estEarnings: number;
  duration: string;
  type: string;
  completion?: number;
}

// Add new interfaces for recordings
interface Recording {
  id?: number;
  session_id: number;
  timestamp: string;
  window_name: string;
  window_id: string;
  thumbnail: string;
  screenshot: string;
  screenshot_path?: string;
  type: 'passive' | 'tasked';
  label?: string;
}

export interface TimeRangeComment {
  id?: number;
  session_id: number;
  start_time: number;
  end_time: number;
  comment: string;
  created_at: string;
}

type PreparedStatements = {
  createRecording: ReturnType<Database['prepare']>;
  updateDuration: ReturnType<Database['prepare']>;
  updateLabel: ReturnType<Database['prepare']>;
  updateScreenshotPath: ReturnType<Database['prepare']>;
  getRecordingById: ReturnType<Database['prepare']>;
  createComment: ReturnType<Database['prepare']>;
  getCommentById: ReturnType<Database['prepare']>;
  deleteComment: ReturnType<Database['prepare']>;
};

// Lazy initialization - database only created when first accessed
let db: Database | null = null;
let preparedStatements: PreparedStatements | null = null;

function getDb(): Database {
  if (db) return db;

  db = new Database(path.join(app.getPath('userData'), 'sessions.sqlite'));

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      duration INTEGER NOT NULL DEFAULT 0,
      approval_state TEXT NOT NULL DEFAULT 'draft',
      session_status TEXT NOT NULL,
      task_id INTEGER,
      reward_id INTEGER,
      CONSTRAINT valid_approval_state CHECK (approval_state IN ('draft', 'submitted', 'approved', 'rejected')),
      CONSTRAINT valid_session_status CHECK (session_status IN ('passive', 'tasked'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS recordings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      window_name TEXT NOT NULL,
      window_id TEXT NOT NULL,
      thumbnail TEXT NOT NULL,
      screenshot TEXT NOT NULL,
      type TEXT NOT NULL,
      label TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      CONSTRAINT valid_type CHECK (type IN ('passive', 'tasked'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );
  `);

  // Migration: Add screenshot_path column if it doesn't exist
  try {
    const rows = db.prepare('PRAGMA table_info(recordings)').all() as any[];
    const hasScreenshotPath = rows.some((row: any) => row.name === 'screenshot_path');

    if (!hasScreenshotPath) {
      db.exec('ALTER TABLE recordings ADD COLUMN screenshot_path TEXT');
      console.log('Added screenshot_path column to recordings table');
    } else {
      console.log('screenshot_path column already exists');
    }
  } catch (err) {
    console.error('Error checking for screenshot_path column:', err);
  }

  // Prepare frequently used statements
  preparedStatements = {
    createRecording: db.prepare(`
      INSERT INTO recordings (
        session_id, timestamp, window_name, window_id,
        thumbnail, screenshot, screenshot_path, type, label
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),

    updateDuration: db.prepare(`
      UPDATE sessions
      SET duration = ?
      WHERE id = ?
    `),

    updateLabel: db.prepare(`
      UPDATE recordings
      SET label = ?
      WHERE id = ?
    `),

    updateScreenshotPath: db.prepare(`
      UPDATE recordings
      SET screenshot_path = ?
      WHERE id = ?
    `),

    getRecordingById: db.prepare(`
      SELECT * FROM recordings
      WHERE id = ?
    `),

    createComment: db.prepare(`
      INSERT INTO comments (
        session_id, start_time, end_time, comment, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `),

    getCommentById: db.prepare(`
      SELECT * FROM comments
      WHERE id = ?
    `),

    deleteComment: db.prepare(`
      DELETE FROM comments
      WHERE id = ?
    `),
  };

  return db;
}

function getStatements(): PreparedStatements {
  getDb(); // Ensure DB is initialized
  return preparedStatements!;
}

export const dbHelpers = {
  createSession: (
    sessionStatus: 'passive' | 'tasked',
    taskId: number | null = null,
  ): Promise<number> => {
    return new Promise((resolve, reject) => {
      try {
        console.log('Creating session with:', { sessionStatus, taskId });
        const stmt = getDb().prepare(`
          INSERT INTO sessions (created_at, session_status, task_id)
          VALUES (?, ?, ?)
        `);
        const params = [new Date().toISOString(), sessionStatus, taskId];
        console.log('SQL params:', params);

        const info = stmt.run(params);
        console.log('Session created with ID:', info.lastInsertRowid);
        resolve(info.lastInsertRowid as number);
      } catch (err) {
        console.error('Failed to create session:', err);
        reject(err);
      }
    });
  },

  updateDuration: (sessionId: number, duration: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        getStatements().updateDuration.run(duration, sessionId);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  },

  submitForApproval: (sessionId: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const stmt = getDb().prepare(`
          UPDATE sessions
          SET approval_state = ?
          WHERE id = ?
        `);
        stmt.run('submitted', sessionId);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  },

  getAllSessions: (): Promise<Session[]> => {
    return new Promise((resolve, reject) => {
      try {
        const stmt = getDb().prepare(`
          SELECT DISTINCT s.*
          FROM sessions s
          INNER JOIN recordings r ON s.id = r.session_id
          ORDER BY s.created_at DESC
        `);
        const rows = stmt.all();
        resolve(rows as Session[]);
      } catch (err) {
        reject(err);
      }
    });
  },

  getSession: (sessionId: number): Promise<Session | null> => {
    return new Promise((resolve, reject) => {
      try {
        const stmt = getDb().prepare(`
          SELECT * FROM sessions
          WHERE id = ?
        `);
        const row = stmt.get(sessionId);
        resolve((row as Session | undefined) || null);
      } catch (err) {
        reject(err);
      }
    });
  },

  getAllTasks: (): Promise<Task[]> => {
    return Promise.resolve([
      {
        id: 42,
        title: 'Go into settings and turn off dark mode',
        description: [
          'Click on the Apple menu (🍎) in the top-left corner of your screen',
          'Select "System Settings" (or "System Preferences" on older macOS versions)',
          'Click on "Appearance" (it usually has a blue icon with an A)',
          'Under "Appearance," you\'ll see three options:',
          '• Light',
          '• Dark',
          '• Auto',
          'Click on "Light" to disable Dark Mode',
          'Close System Settings - changes apply immediately',
        ],
        category: 'Computer Settings',
        difficulty: 'Medium',
        estEarnings: 450,
        duration: '4 min',
        type: 'Computer software',
        completion: 67,
      },
    ]);
  },

  getTaskById: (taskId: number): Promise<Task | null> => {
    return dbHelpers
      .getAllTasks()
      .then((tasks) => tasks.find((task) => task.id === taskId) || null);
  },

  createRecording: async (recording: {
    session_id: number;
    timestamp: string;
    window_name: string;
    window_id: string;
    thumbnail: string;
    screenshot: string;
    screenshot_path?: string;
    type: 'passive' | 'tasked';
    label?: string;
  }) => {
    return new Promise((resolve, reject) => {
      try {
        const info = getStatements().createRecording.run(
          recording.session_id,
          recording.timestamp,
          recording.window_name,
          recording.window_id,
          recording.thumbnail,
          recording.screenshot,
          recording.screenshot_path || null,
          recording.type,
          recording.label || null,
        );
        resolve(info.lastInsertRowid as number);
      } catch (err) {
        reject(err);
      }
    });
  },

  getSessionRecordings: (sessionId: number): Promise<Recording[]> => {
    return new Promise((resolve, reject) => {
      try {
        const stmt = getDb().prepare(`
          SELECT * FROM recordings
          WHERE session_id = ?
          ORDER BY timestamp ASC
        `);
        const rows = stmt.all(sessionId);
        resolve(rows as Recording[]);
      } catch (err) {
        reject(err);
      }
    });
  },

  deleteSession: (sessionId: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const deleteRecStmt = getDb().prepare('DELETE FROM recordings WHERE session_id = ?');
        deleteRecStmt.run(sessionId);

        const deleteSessionStmt = getDb().prepare('DELETE FROM sessions WHERE id = ?');
        deleteSessionStmt.run(sessionId);

        resolve();
      } catch (err) {
        reject(err);
      }
    });
  },

  deleteRecording: (sessionId: number, recordingId: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const stmt = getDb().prepare(`
          DELETE FROM recordings
          WHERE session_id = ? AND id = ?
        `);
        stmt.run(sessionId, recordingId);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  },

  updateRecordingLabel: (recordingId: number, label: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        getStatements().updateLabel.run(label, recordingId);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  },

  updateRecordingScreenshotPath: (recordingId: number, screenshotPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        getStatements().updateScreenshotPath.run(screenshotPath, recordingId);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  },

  getRecordingById: (recordingId: number): Promise<Recording | null> => {
    return new Promise((resolve, reject) => {
      try {
        const row = getStatements().getRecordingById.get(recordingId);
        resolve((row as Recording | undefined) || null);
      } catch (err) {
        reject(err);
      }
    });
  },

  createComment: (comment: TimeRangeComment): Promise<number> => {
    return new Promise((resolve, reject) => {
      try {
        const info = getStatements().createComment.run(
          comment.session_id,
          comment.start_time,
          comment.end_time,
          comment.comment,
          comment.created_at,
        );
        resolve(info.lastInsertRowid as number);
      } catch (err) {
        reject(err);
      }
    });
  },

  getCommentById: (commentId: number): Promise<TimeRangeComment | null> => {
    return new Promise((resolve, reject) => {
      try {
        const row = getStatements().getCommentById.get(commentId);
        resolve((row as TimeRangeComment | undefined) || null);
      } catch (err) {
        reject(err);
      }
    });
  },

  deleteComment: (commentId: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        getStatements().deleteComment.run(commentId);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  },

  updateComment: (commentId: number, updatedComment: Partial<TimeRangeComment>): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const stmt = getDb().prepare(`
          UPDATE comments
          SET start_time = ?, end_time = ?, comment = ?
          WHERE id = ?
        `);
        stmt.run(
          updatedComment.start_time,
          updatedComment.end_time,
          updatedComment.comment,
          commentId,
        );
        resolve();
      } catch (err) {
        console.error('Failed to update comment in database:', err);
        reject(err);
      }
    });
  },

  getSessionComments: (sessionId: number): Promise<TimeRangeComment[]> => {
    return new Promise((resolve, reject) => {
      try {
        const stmt = getDb().prepare(`
          SELECT * FROM comments
          WHERE session_id = ?
          ORDER BY start_time ASC
        `);
        const rows = stmt.all(sessionId);
        resolve(rows as TimeRangeComment[]);
      } catch (err) {
        console.error('Failed to get session comments:', err);
        reject(err);
      }
    });
  },

  upsertSession: (session: Session): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const stmt = getDb().prepare(`
          INSERT INTO sessions (id, created_at, duration, approval_state, session_status, task_id, reward_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            duration = excluded.duration,
            approval_state = excluded.approval_state,
            task_id = excluded.task_id,
            reward_id = excluded.reward_id
        `);
        stmt.run(
          session.id,
          session.created_at,
          session.duration,
          session.approval_state,
          session.session_status,
          session.task_id,
          session.reward_id,
        );
        resolve();
      } catch (err) {
        console.error('Failed to upsert session:', err);
        reject(err);
      }
    });
  },
};
