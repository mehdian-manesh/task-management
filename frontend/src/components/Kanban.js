import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  useTheme,
} from '@mui/material';
import { taskService, projectService } from '../api/services';
import moment from 'moment-jalaali';
import { toPersianNumbers } from '../utils/numberUtils';

const COLUMNS = [
  { id: 'backlog', title: 'لیست انتظار', color: '#9e9e9e' },
  { id: 'todo', title: 'باید انجام شود', color: '#2196f3' },
  { id: 'doing', title: 'در حال انجام', color: '#ff9800' },
  { id: 'test', title: 'در حال تست', color: '#9c27b0' },
  { id: 'done', title: 'انجام شده', color: '#4caf50' },
  { id: 'postpone', title: 'معوق شده', color: '#f44336' },
];

const Kanban = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const isDraggingRef = useRef(false);
  const draggedTaskIdRef = useRef(null);
  const frozenTasksByStatusRef = useRef(null); // Freeze tasksByStatus during drag
  const [isDragging, setIsDragging] = useState(false); // Keep for UI updates (like disabling dropdown)
  const [draggedTaskId, setDraggedTaskId] = useState(null); // Keep for logging
  const lastMousePosRef = useRef({ x: 0, y: 0 }); // Track mouse position
  const dragStartOffsetRef = useRef({ x: 0, y: 0 }); // Track initial click offset from element
  const dragStartElementPosRef = useRef({ x: 0, y: 0 }); // Track initial element screen position

  useEffect(() => {
    loadTasks();
    loadProjects();
    
    // Track mouse position globally for drag offset calculation
    const handleMouseMove = (e) => {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const loadTasks = async () => {
    try {
      const response = await taskService.getAll();
      // Handle paginated response - for Kanban we want all tasks, so get all pages if needed
      const tasksData = response.data.results || response.data;
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await projectService.getAll();
      // Handle paginated response
      const projectsData = response.data.results || response.data;
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  // Memoize valid tasks to prevent unnecessary re-renders
  const validTasks = useMemo(() => {
    const validStatuses = COLUMNS.map(col => col.id);
    return tasks.filter(task => 
      task.status && validStatuses.includes(task.status)
    );
  }, [tasks]);

  // Memoize tasks by status - CRITICAL: Don't include isDragging to prevent re-render during drag
  // During drag, we need to ensure the dragged task remains in its original column
  const tasksByStatus = useMemo(() => {
    const result = {};
    COLUMNS.forEach(column => {
      let filteredTasks = validTasks.filter(task => task.status === column.id);

      if (selectedProject !== 'all') {
        if (selectedProject === 'none') {
          filteredTasks = filteredTasks.filter(task => !task.project_id);
        } else {
          filteredTasks = filteredTasks.filter(task => task.project_id === parseInt(selectedProject));
        }
      }

      result[column.id] = filteredTasks;
    });
    
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // isDragging and draggedTaskId intentionally omitted to prevent re-renders during drag
  }, [validTasks, selectedProject]);

  const getTasksByStatus = (status) => {
    // During drag, use frozen list to maintain stability for react-beautiful-dnd
    if (isDraggingRef.current && frozenTasksByStatusRef.current) {
      return frozenTasksByStatusRef.current[status] || [];
    }
    
    return tasksByStatus[status] || [];
  };

  const handleDragStart = (start) => {
    // Capture mouse position and element position at drag start
    const draggedElement = document.querySelector(`[data-rbd-draggable-id="${start.draggableId}"]`);
    const container = document.querySelector('[data-rbd-drag-drop-context-id]');
    const scrollContainer = container?.closest('[style*="overflow"]') || document.querySelector('body');
    
    let mousePos = { x: 0, y: 0 };
    let elementRect = null;
    let containerRect = null;
    let scrollInfo = null;
    let computedStyles = null;
    let rtlInfo = null;
    
    if (draggedElement) {
      elementRect = draggedElement.getBoundingClientRect();
      computedStyles = window.getComputedStyle(draggedElement);
      rtlInfo = {
        direction: computedStyles.direction,
        textAlign: computedStyles.textAlign,
        transform: computedStyles.transform,
        position: computedStyles.position,
        left: computedStyles.left,
        right: computedStyles.right,
      };
    }
    
    if (container) {
      containerRect = container.getBoundingClientRect();
    }
    
    if (scrollContainer) {
      scrollInfo = {
        scrollLeft: scrollContainer.scrollLeft,
        scrollTop: scrollContainer.scrollTop,
        scrollWidth: scrollContainer.scrollWidth,
        scrollHeight: scrollContainer.scrollHeight,
        clientWidth: scrollContainer.clientWidth,
        clientHeight: scrollContainer.clientHeight,
      };
    }
    
    // Use tracked mouse position
    mousePos = lastMousePosRef.current;
    
    // Use a very small fixed offset to keep card close to cursor
    if (elementRect && mousePos.x > 0 && mousePos.y > 0) {
      // Fixed small offset - card will be very close to cursor (more left/top)
      dragStartOffsetRef.current = {
        x: 20, // 20px offset
        y: 20, // 20px offset
      };
      // Store initial element screen position
      dragStartElementPosRef.current = {
        x: elementRect.left,
        y: elementRect.top,
      };
    }
    
    // Freeze the current tasksByStatus to maintain list stability during drag
    // This is critical for react-beautiful-dnd - it needs stable list references
    frozenTasksByStatusRef.current = { ...tasksByStatus };
    
    // Use refs to avoid re-renders during drag
    isDraggingRef.current = true;
    draggedTaskIdRef.current = start.draggableId;
    
    // Only update state for UI (like disabling dropdown) - this causes minimal re-render
    setIsDragging(true);
    setDraggedTaskId(start.draggableId);
  };

  const handleDragEnd = async (result) => {
    // Reset dragging state immediately (both refs and state)
    isDraggingRef.current = false;
    draggedTaskIdRef.current = null;
    frozenTasksByStatusRef.current = null; // Clear frozen list
    dragStartOffsetRef.current = { x: 0, y: 0 }; // Reset offset
    dragStartElementPosRef.current = { x: 0, y: 0 }; // Reset element position
    setIsDragging(false);
    setDraggedTaskId(null);

    if (!result.destination) {
      return;
    }

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId) {
      return;
    }

    const taskId = parseInt(draggableId);
    const newStatus = destination.droppableId;

    // Find the task to get its current status for rollback
    const task = validTasks.find(t => t.id === taskId);
    if (!task) {
      console.error('Task not found:', taskId);
      return;
    }

    const oldStatus = task.status;

    // Optimistically update UI
    setTasks(prevTasks => 
      prevTasks.map(t =>
        t.id === taskId ? { ...t, status: newStatus } : t
      )
    );

    try {
      await taskService.update(taskId, { status: newStatus });
    } catch (error) {
      console.error('Error updating task status:', error);
      // Rollback on error
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === taskId ? { ...t, status: oldStatus } : t
        )
      );
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setOpenDialog(true);
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : '-';
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5">تابلو کانبان</Typography>
        <TextField
          select
          size="small"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          SelectProps={{ native: true }}
          sx={{ minWidth: 200 }}
          disabled={isDragging}
        >
          <option value="all">همه پروژه‌ها</option>
          <option value="none">بدون پروژه</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </TextField>
      </Box>

      <DragDropContext 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
        onDragUpdate={() => {}}
      >
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
          {COLUMNS.map((column) => (
            <Box key={column.id} sx={{ minWidth: 280, flex: '0 0 280px' }}>
              <Paper sx={{ 
                p: 2, 
                backgroundColor: isDark 
                  ? 'rgba(15, 23, 42, 0.4)' 
                  : 'rgba(255, 255, 255, 0.7)',
                border: isDark
                  ? '1px solid rgba(255, 255, 255, 0.15)'
                  : '1px solid rgba(0, 0, 0, 0.08)',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: column.color,
                    }}
                  />
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontSize: '0.9rem',
                      color: isDark ? '#ffffff' : 'rgba(0, 0, 0, 0.87)',
                    }}
                  >
                    {column.title}
                  </Typography>
                  <Chip
                    label={toPersianNumbers(getTasksByStatus(column.id).length)}
                    size="small"
                    sx={{
                      ml: 'auto',
                      color: 'text.primary',
                      fontWeight: 600,
                      backgroundColor: (theme) => theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.2)'
                        : 'rgba(0, 0, 0, 0.08)',
                      '& .MuiChip-label': {
                        color: (theme) => theme.palette.mode === 'dark'
                          ? '#ffffff'
                          : '#1e293b',
                        fontWeight: 600,
                      }
                    }}
                  />
                </Box>

                <Droppable 
                  droppableId={column.id}
                  type="TASK"
                  isDropDisabled={false}
                  isCombineEnabled={false}
                  ignoreContainerClipping={true}
                >
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{
                        minHeight: 400,
                        backgroundColor: snapshot.isDraggingOver 
                          ? (isDark 
                              ? 'rgba(37, 99, 235, 0.15)' 
                              : 'rgba(37, 99, 235, 0.08)')
                          : 'transparent',
                        borderRadius: 1,
                        transition: 'background-color 0.2s',
                      }}
                    >
                      {(() => {
                        const columnTasks = getTasksByStatus(column.id);
                        return columnTasks.map((task, index) => (
                          <Draggable
                            key={task.id}
                            draggableId={String(task.id)}
                            index={index}
                            isDragDisabled={false}
                            isCombineEnabled={false}
                          >
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={provided.draggableProps.style}
                                sx={{
                                  mb: 1,
                                  cursor: 'grab',
                                  opacity: snapshot.isDragging ? 0.8 : 1,
                                  borderLeft: `4px solid ${task.color || column.color}`,
                                  position: 'relative',
                                  '&:hover': {
                                    boxShadow: 3,
                                  },
                                  '&:active': {
                                    cursor: 'grabbing',
                                  },
                                }}
                                onClick={() => !isDragging && handleTaskClick(task)}
                              >
                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, pr: 3 }}>
                                    {task.name}
                                  </Typography>
                                  {task.project_id && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                      {getProjectName(task.project_id)}
                                    </Typography>
                                  )}
                                  {task.deadline && (
                                    <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                                      موعد: <Box component="span" dir="ltr" style={{ direction: 'ltr', display: 'inline-block' }}>{moment(task.deadline).format('jYYYY/jMM/jDD')}</Box>
                                    </Typography>
                                  )}
                                  {task.is_draft && (
                                    <Chip label="پیش‌نویس" size="small" color="warning" sx={{ mt: 0.5 }} />
                                  )}
                                  {task.phase > 0 && (
                                    <Chip
                                      label={toPersianNumbers(`فاز ${task.phase}`)}
                                      size="small"
                                      sx={{
                                        mt: 0.5,
                                        ml: 0.5,
                                        color: 'text.primary',
                                        fontWeight: 600,
                                        backgroundColor: (theme) => theme.palette.mode === 'dark'
                                          ? 'rgba(255, 255, 255, 0.2)'
                                          : 'rgba(0, 0, 0, 0.08)',
                                        '& .MuiChip-label': {
                                          color: (theme) => theme.palette.mode === 'dark'
                                            ? '#ffffff'
                                            : '#1e293b',
                                          fontWeight: 600,
                                        }
                                      }}
                                    />
                                  )}
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ));
                      })()}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </Paper>
            </Box>
          ))}
        </Box>
      </DragDropContext>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        {selectedTask && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: selectedTask.color || '#1976d2',
                }}
              />
              {selectedTask.name}
            </DialogTitle>
            <DialogContent>
              {selectedTask.description && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">توضیحات:</Typography>
                  <Typography variant="body2">{selectedTask.description}</Typography>
                </Box>
              )}
              {selectedTask.project_id && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">پروژه:</Typography>
                  <Typography variant="body2">{getProjectName(selectedTask.project_id)}</Typography>
                </Box>
              )}
              {selectedTask.phase > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">فاز:</Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: (theme) => theme.palette.mode === 'dark'
                        ? '#ffffff'
                        : '#1e293b',
                      fontWeight: 600,
                      fontSize: '1rem'
                    }}
                  >
                    {toPersianNumbers(selectedTask.phase)}
                  </Typography>
                </Box>
              )}
              {selectedTask.start_date && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">تاریخ شروع:</Typography>
                  <Typography variant="body2" component="div">
                    <Box component="span" dir="ltr" style={{ direction: 'ltr', display: 'inline-block' }}>
                      {moment(selectedTask.start_date).format('jYYYY/jMM/jDD')}
                    </Box>
                  </Typography>
                </Box>
              )}
              {selectedTask.deadline && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">موعد نهایی:</Typography>
                  <Typography variant="body2" color="error" component="div">
                    <Box component="span" dir="ltr" style={{ direction: 'ltr', display: 'inline-block' }}>
                      {moment(selectedTask.deadline).format('jYYYY/jMM/jDD')}
                    </Box>
                  </Typography>
                </Box>
              )}
              {selectedTask.estimated_hours > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">برآورد نفر-ساعت:</Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: (theme) => theme.palette.mode === 'dark'
                        ? '#ffffff'
                        : '#1e293b',
                      fontWeight: 600,
                      fontSize: '1rem'
                    }}
                  >
                    {toPersianNumbers(selectedTask.estimated_hours)}
                  </Typography>
                </Box>
              )}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">وضعیت:</Typography>
                <Chip
                  label={COLUMNS.find(c => c.id === selectedTask.status)?.title}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>
              {selectedTask.is_draft && (
                <Chip label="این وظیفه یک پیش‌نویس است" color="warning" />
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDialog(false)}>بستن</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default Kanban;
