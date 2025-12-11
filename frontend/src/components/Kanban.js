import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
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
  { id: 'archive', title: 'بایگانی', color: '#607d8b' },
];

const Kanban = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    loadTasks();
    loadProjects();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await taskService.getAll();
      setTasks(response.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await projectService.getAll();
      setProjects(response.data);
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
  }, [validTasks, selectedProject]);

  const getTasksByStatus = (status) => {
    return tasksByStatus[status] || [];
  };

  const handleDragStart = (start) => {
    setIsDragging(true);
  };

  const handleDragEnd = async (result) => {
    // Reset dragging state immediately
    setIsDragging(false);

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
      >
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
          {COLUMNS.map((column) => (
            <Box key={column.id} sx={{ minWidth: 280, flex: '0 0 280px' }}>
              <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: column.color,
                    }}
                  />
                  <Typography variant="h6" sx={{ fontSize: '0.9rem' }}>
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
                >
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{
                        minHeight: 400,
                        backgroundColor: snapshot.isDraggingOver ? '#e3f2fd' : 'transparent',
                        borderRadius: 1,
                        transition: 'background-color 0.2s',
                      }}
                    >
                      {getTasksByStatus(column.id).map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={String(task.id)}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              sx={{
                                mb: 1,
                                cursor: 'pointer',
                                opacity: snapshot.isDragging ? 0.8 : 1,
                                borderLeft: `4px solid ${task.color || column.color}`,
                                position: 'relative',
                                '&:hover': {
                                  boxShadow: 3,
                                },
                              }}
                              onClick={() => !isDragging && handleTaskClick(task)}
                            >
                              <Box
                                {...provided.dragHandleProps}
                                sx={{
                                  position: 'absolute',
                                  right: 4,
                                  top: 4,
                                  cursor: 'grab',
                                  color: 'text.secondary',
                                  '&:active': {
                                    cursor: 'grabbing',
                                  },
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <DragIndicatorIcon fontSize="small" />
                              </Box>
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
                                    موعد: {moment(task.deadline).format('jYYYY/jMM/jDD')}
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
                      ))}
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
                  <Typography variant="body2">{moment(selectedTask.start_date).format('jYYYY/jMM/jDD')}</Typography>
                </Box>
              )}
              {selectedTask.deadline && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">موعد نهایی:</Typography>
                  <Typography variant="body2" color="error">{moment(selectedTask.deadline).format('jYYYY/jMM/jDD')}</Typography>
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
