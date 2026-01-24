import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

// Get the recordings directory path
export function getRecordingsDir(): string {
  return path.join(app.getPath('userData'), 'recordings');
}

// Get session folder path
export function getSessionFolder(sessionId: number): string {
  return path.join(getRecordingsDir(), `session_${sessionId}`);
}

// Ensure recordings directory exists
export function ensureRecordingsDir(): void {
  const recordingsDir = getRecordingsDir();
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }
}

// Create session folder
export function createSessionFolder(sessionId: number): string {
  ensureRecordingsDir();
  const sessionFolder = getSessionFolder(sessionId);

  if (!fs.existsSync(sessionFolder)) {
    fs.mkdirSync(sessionFolder, { recursive: true });
  }

  return sessionFolder;
}

// Convert Base64 data URL to buffer
function base64ToBuffer(base64String: string): Buffer {
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// Save screenshot as PNG file
export function saveScreenshot(
  sessionId: number,
  recordingId: number,
  base64Image: string
): string {
  const sessionFolder = createSessionFolder(sessionId);
  const filename = `screenshot_${String(recordingId).padStart(3, '0')}.png`;
  const filePath = path.join(sessionFolder, filename);

  const imageBuffer = base64ToBuffer(base64Image);
  fs.writeFileSync(filePath, imageBuffer);

  return filePath;
}

// Read screenshot file and convert to Base64 data URL
export function readScreenshot(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const imageBuffer = fs.readFileSync(filePath);
    const base64 = imageBuffer.toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Error reading screenshot:', error);
    return null;
  }
}

// Delete session folder and all contents
export function deleteSessionFolder(sessionId: number): void {
  const sessionFolder = getSessionFolder(sessionId);

  if (fs.existsSync(sessionFolder)) {
    fs.rmSync(sessionFolder, { recursive: true, force: true });
  }
}

// Format duration in human-readable format
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Format timestamp for metadata file
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

// Format time range for comments (seconds to MM:SS)
function formatTimeRange(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Generate metadata.txt file
export function generateMetadataFile(
  sessionId: number,
  session: any,
  recordings: any[],
  comments: any[]
): void {
  const sessionFolder = getSessionFolder(sessionId);
  const metadataPath = path.join(sessionFolder, 'metadata.txt');

  let content = '';

  // Session Information
  content += 'SESSION INFORMATION\n';
  content += '==================\n';
  content += `Session ID: ${session.id}\n`;
  content += `Created: ${formatTimestamp(session.created_at)}\n`;
  content += `Duration: ${formatDuration(session.duration || 0)}\n`;
  content += `Status: ${session.approval_state}\n`;
  content += `Type: ${session.session_status}\n`;
  if (session.task_id) {
    content += `Task ID: ${session.task_id}\n`;
  }
  content += '\n';

  // Recordings
  content += 'RECORDINGS\n';
  content += '==========\n';
  if (recordings.length === 0) {
    content += 'No recordings yet.\n';
  } else {
    recordings.forEach((recording, index) => {
      content += `${index + 1}. ${path.basename(recording.screenshot_path || recording.screenshot)}\n`;
      content += `   Timestamp: ${formatTimestamp(recording.timestamp)}\n`;
      content += `   Window: ${recording.window_name}\n`;
      if (recording.label) {
        content += `   Label: ${recording.label}\n`;
      }
      content += '\n';
    });
  }

  // Comments
  if (comments.length > 0) {
    content += 'COMMENTS\n';
    content += '========\n';
    comments.forEach((comment) => {
      const startTime = formatTimeRange(comment.start_time);
      const endTime = formatTimeRange(comment.end_time);
      content += `[${startTime} - ${endTime}] ${comment.comment}\n`;
    });
    content += '\n';
  }

  // Write to file
  fs.writeFileSync(metadataPath, content, 'utf-8');
}

// Save session info as JSON
export function saveSessionInfo(
  sessionId: number,
  session: any,
  recordings: any[],
  comments: any[]
): void {
  const sessionFolder = getSessionFolder(sessionId);
  const infoPath = path.join(sessionFolder, 'session_info.json');

  const sessionInfo = {
    session: {
      id: session.id,
      created_at: session.created_at,
      duration: session.duration || 0,
      approval_state: session.approval_state,
      session_status: session.session_status,
      task_id: session.task_id || null,
      reward_id: session.reward_id || null,
    },
    recordings: recordings.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      window_name: r.window_name,
      window_id: r.window_id,
      screenshot_file: path.basename(r.screenshot_path || r.screenshot || ''),
      type: r.type,
      label: r.label || null,
    })),
    comments: comments.map((c) => ({
      id: c.id,
      start_time: c.start_time,
      end_time: c.end_time,
      comment: c.comment,
      created_at: c.created_at,
    })),
  };

  fs.writeFileSync(infoPath, JSON.stringify(sessionInfo, null, 2), 'utf-8');
}

// Load session info from JSON
export function loadSessionInfo(sessionId: number): any | null {
  const sessionFolder = getSessionFolder(sessionId);
  const infoPath = path.join(sessionFolder, 'session_info.json');

  try {
    if (!fs.existsSync(infoPath)) {
      return null;
    }

    const content = fs.readFileSync(infoPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading session info:', error);
    return null;
  }
}

// Update session metadata (called after any changes)
export async function updateSessionMetadata(
  sessionId: number,
  getSession: (id: number) => Promise<any>,
  getRecordings: (id: number) => Promise<any[]>,
  getComments: (id: number) => Promise<any[]>
): Promise<void> {
  try {
    const session = await getSession(sessionId);
    const recordings = await getRecordings(sessionId);
    const comments = await getComments(sessionId);

    if (session) {
      generateMetadataFile(sessionId, session, recordings, comments);
      saveSessionInfo(sessionId, session, recordings, comments);
    }
  } catch (error) {
    console.error('Error updating session metadata:', error);
  }
}

// Get storage stats
export function getStorageStats(): {
  totalSessions: number;
  totalSize: number;
  recordingsDir: string;
} {
  const recordingsDir = getRecordingsDir();

  if (!fs.existsSync(recordingsDir)) {
    return {
      totalSessions: 0,
      totalSize: 0,
      recordingsDir,
    };
  }

  const sessions = fs.readdirSync(recordingsDir).filter((name) =>
    name.startsWith('session_')
  );

  let totalSize = 0;
  sessions.forEach((sessionFolder) => {
    const folderPath = path.join(recordingsDir, sessionFolder);
    const files = fs.readdirSync(folderPath);
    files.forEach((file) => {
      const filePath = path.join(folderPath, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    });
  });

  return {
    totalSessions: sessions.length,
    totalSize,
    recordingsDir,
  };
}
