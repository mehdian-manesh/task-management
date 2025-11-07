import React, { useState, useEffect } from 'react';
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
import { taskService, projectService } from '../api/services';
import moment from 'moment-jalaali';

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

  const getTasksByStatus = (status) => {
    let filteredTasks = tasks.filter(task => task.status === status);

    if (selectedProject !== 'all') {
      if (selectedProject === 'none') {
        filteredTasks = filteredTasks.filter(task => !task.project_id);
      } else {
        filteredTasks = filteredTasks.filter(task => task.project_id === parseInt(selectedProject));
      }
    }

    return filteredTasks;
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId) return;

    const taskId = parseInt(draggableId);
    const newStatus = destination.droppableId;

    try {
      await taskService.update(taskId, { status: newStatus });

      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (error) {
      console.error('Error updating task status:', error);
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

      <DragDropContext onDragEnd={handleDragEnd}>
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
                    label={getTasksByStatus(column.id).length}
                    size="small"
                    sx={{ ml: 'auto' }}
                  />
                </Box>

                <Droppable droppableId={column.id}>
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
                              {...provided.dragHandleProps}
                              sx={{
                                mb: 1,
                                cursor: 'grab',
                                opacity: snapshot.isDragging ? 0.8 : 1,
                                borderLeft: `4px solid ${task.color || column.color}`,
                                '&:hover': {
                                  boxShadow: 3,
                                },
                              }}
                              onClick={() => handleTaskClick(task)}
                            >
                              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                  {task.name}
                                </Typography>
                                {task.project_id && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
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
                                  <Chip label={`فاز ${task.phase}`} size="small" sx={{ mt: 0.5, ml: 0.5 }} />
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
                  <Typography variant="body2">{selectedTask.phase}</Typography>
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
                  <Typography variant="body2">{selectedTask.estimated_hours}</Typography>
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
