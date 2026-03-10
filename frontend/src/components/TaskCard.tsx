import { useState } from 'react';
// @ts-ignore
import { TaskService } from '../services/taskService.js';
import { FiInfo, FiEdit2, FiCheck, FiTrash2 } from 'react-icons/fi';
export default function TaskCard({ task, workspaceId: _workspaceId, onTaskChange }: any) {
  // ⚡ NEW: State to control our slick new UI features
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.content);
  const [showInfo, setShowInfo] = useState(false);

  const isSynced = task.synced ? 'synced' : 'unsynced';
  const syncLabel = task.synced ? 'SYNCED' : 'UNSYNCED';
  const time = new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fullDate = new Date(task.createdAt).toLocaleString();

  const handleDragStart = (e: any) => {
    e.dataTransfer.setData('taskId', task.id);
  };

  // --- ⚡ NEW INLINE EDIT LOGIC ---
  const handleSaveEdit = async () => {
    if (editValue.trim() === '') {
      setIsEditing(false); // Cancel if empty
      setEditValue(task.content);
      return;
    }
    
    if (editValue !== task.content) {
      task.content = editValue.trim();
      await TaskService.updateTask(task);
      onTaskChange(); // Refresh board
    }
    setIsEditing(false);
  };

  // Allow pressing Enter to save, or Escape to cancel
  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter') handleSaveEdit();
    if (e.key === 'Escape') {
      setEditValue(task.content);
      setIsEditing(false);
    }
  };

  // --- ACTIONS ---
  const handleComplete = async () => {
    task.completed = true;
    await TaskService.updateTask(task);
    onTaskChange();
  };

  const handleDelete = async () => {
    if (confirm("Delete mission?")) {
      await TaskService.deleteTask(task.id);
      onTaskChange();
    }
  };

  return (
    <li className={`task-card ${isSynced}`}
      draggable={!isEditing}            /* ⚡ Disable dragging while typing */
      onDragStart={handleDragStart} 
      style={{ cursor: isEditing ? 'default' : 'grab' }}
    >
      <div className="task-content">
        
        {/* ⚡ THE INLINE EDITOR */}
        {isEditing ? (
          <div className="edit-mode">
            <input 
              type="text" 
              value={editValue} 
              onChange={(e) => setEditValue(e.target.value)} 
              onKeyDown={handleKeyDown}
              onBlur={handleSaveEdit} /* Saves if they click away */
              autoFocus
              style={{ 
                width: '100%', padding: '4px', borderRadius: '4px', 
                border: '1px solid #007bff', outline: 'none', 
                fontFamily: 'inherit', fontSize: 'inherit',
                marginBottom: '4px'
              }}
            />
          </div>
        ) : (
          <span 
            className="task-text" 
            style={task.completed ? { textDecoration: 'line-through', color: '#aaa' } : {}}
          >
            {task.content}
          </span>
        )}

        <div className="task-meta">
          <span className={`meta-tag ${isSynced}`}>{syncLabel}</span>
          <span>{time}</span>
        </div>

        {/* ⚡ THE EXPANDABLE INFO PANEL */}
        {showInfo && (
          <div className="task-info-panel" style={{ 
            marginTop: '10px', padding: '8px', backgroundColor: '#2a2a2a', 
            borderRadius: '4px', fontSize: '0.8rem', color: '#bbb',
            border: '1px solid #444', wordBreak: 'break-all'
          }}>
            <div style={{ marginBottom: '4px' }}><strong>ID:</strong> {task.id}</div>
            <div><strong>Created:</strong> {fullDate}</div>
          </div>
        )}
      </div>
      
      <div className="task-actions" style={{ display: 'flex', gap: '8px' }}>
        <button className="action-btn info-btn" title="Details" onClick={() => { setShowInfo(!showInfo); setIsEditing(false); }}>
            <FiInfo size={14} />
        </button>
        <button className="action-btn edit-btn" title="Edit" onClick={() => { setIsEditing(!isEditing); setShowInfo(false); }}>
            <FiEdit2 size={14} />
        </button>
        
        {!task.completed && (
          <button className="action-btn complete-btn" title="Complete" onClick={handleComplete}>
            <FiCheck size={16} />
          </button>
        )}
        
        <button className="action-btn delete-btn" title="Delete" onClick={handleDelete}>
            <FiTrash2 size={14} />
        </button>
      </div>
    </li>
  );
}
