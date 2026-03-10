// Notice we don't need useState or useEffect here anymore!
// @ts-ignore
import { TaskService } from '../services/taskService.js';
import TaskInput from './TaskInput';
import TaskCard from './TaskCard';
import { useTasks } from '../hooks/useTasks'; // ⚡ Import your new hook

export default function TaskBoard({ workspaceId, workspaceTitle: _workspaceTitle, searchQuery }: any) {
  
  // ⚡ Call the hook! It does all the heavy lifting behind the scenes.
  const { tasks, activeTasks, completedTasks, fetchTasks } = useTasks(workspaceId);

  const safeQuery = (searchQuery || '').toLowerCase();

  const filteredActive = activeTasks.filter((t: any) => 
    t.content.toLowerCase().includes(safeQuery)
  );
  
  const filteredCompleted = completedTasks.filter((t: any) => 
    t.content.toLowerCase().includes(safeQuery)
  );

  // --- DRAG AND DROP INTERACTION ---
  const handleDragOver = (e: any) => {
    e.preventDefault(); 
  };

  const handleDrop = async (e: any, newCompletedStatus: boolean) => {
    e.preventDefault();
    const draggedTaskId = e.dataTransfer.getData('taskId');
    if (!draggedTaskId) return;

    const taskToUpdate = tasks.find(t => t.id === draggedTaskId);
    if (taskToUpdate && taskToUpdate.completed !== newCompletedStatus) {
      taskToUpdate.completed = newCompletedStatus;
      await TaskService.updateTask(taskToUpdate);
      fetchTasks(); 
    }
  };

  // --- UI RENDER ---
  return (
    <div className="kanban-board">
      
      {/* ACTIVE COLUMN */}
      <section className="column" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, false)}>
        <div className="column-header">
          <h2>Active Missions</h2>
          <span className="count-badge">{filteredActive.length}</span>
        </div>
        
        <TaskInput workspaceId={workspaceId} onTaskAdded={fetchTasks} />

        <ul className="task-list">
          {filteredActive.length > 0 ? (
            filteredActive.map((task: any) => (
              <TaskCard key={task.id} task={task} workspaceId={workspaceId} onTaskChange={fetchTasks} />
            ))
          ) : (
            <div style={{ color: '#aaa', fontSize: '0.9rem', padding: '10px', textAlign: 'center' }}>
              {searchQuery ? "No matching missions found." : "No active missions."}
            </div>
          )}
        </ul>
      </section>

      {/* COMPLETED COLUMN */}
      <section className="column" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, true)}>
        <div className="column-header">
          <h2>Completed</h2>
          <span className="count-badge">{filteredCompleted.length}</span>
        </div>
        
        <ul className="task-list completed-zone" style={{ minHeight: '200px' }}>
          {/* ⚡ Map over the FILTERED array instead of the raw array */}
          {filteredCompleted.length > 0 ? (
            filteredCompleted.map((task: any) => (
              <TaskCard key={task.id} task={task} workspaceId={workspaceId} onTaskChange={fetchTasks} />
            ))
          ) : (
            <div style={{ color: '#aaa', fontSize: '0.9rem', padding: '10px', textAlign: 'center' }}>
              {searchQuery ? "No matching archives found." : "Empty archives."}
            </div>
          )}
        </ul>
      </section>

    </div>
  );
}
