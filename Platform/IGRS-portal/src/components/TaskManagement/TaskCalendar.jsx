import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select } from "../ui/select";

const TaskCalendar = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    startTime: '',
    endTime: '',
    status: 'pending'
  });

  // Sample tasks for February
  const sampleEvents = [
    {
      title: 'Water Supply Issue',
      start: '2024-02-01T10:00:00',
      end: '2024-02-01T12:00:00',
      extendedProps: {
        status: 'completed',
        priority: 'high',
        description: 'Address water supply disruption in Sector 5'
      },
      backgroundColor: '#10B981', // Green for completed
      borderColor: '#059669'
    },
    {
      title: 'Road Maintenance',
      start: '2024-02-15T09:00:00',
      end: '2024-02-17T18:00:00',
      extendedProps: {
        status: 'in-progress',
        priority: 'medium',
        description: 'Major road repair work on Main Street'
      },
      backgroundColor: '#F59E0B', // Yellow for in-progress
      borderColor: '#D97706'
    },
    {
      title: 'Emergency Response',
      start: '2024-02-10T14:00:00',
      end: '2024-02-10T16:00:00',
      extendedProps: {
        status: 'pending',
        priority: 'urgent',
        description: 'Respond to flooding reports in downtown area'
      },
      backgroundColor: '#EF4444', // Red for pending urgent
      borderColor: '#DC2626'
    }
  ];

  const handleDateClick = (arg) => {
    setSelectedDate(arg.date);
    setIsDialogOpen(true);
    setNewTask(prev => ({
      ...prev,
      startTime: arg.dateStr + 'T09:00:00',
      endTime: arg.dateStr + 'T10:00:00'
    }));
  };

  const handleEventClick = (info) => {
    alert(`
      Task: ${info.event.title}
      Status: ${info.event.extendedProps.status}
      Priority: ${info.event.extendedProps.priority}
      Description: ${info.event.extendedProps.description}
      Start: ${info.event.start.toLocaleString()}
      End: ${info.event.end.toLocaleString()}
    `);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        initialDate="2024-02-01"
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        events={sampleEvents}
        height="auto"
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: true
        }}
        slotMinTime="06:00:00"
        slotMaxTime="20:00:00"
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task for {selectedDate?.toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleTaskSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                id="priority"
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={newTask.startTime}
                onChange={(e) => setNewTask({ ...newTask, startTime: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={newTask.endTime}
                onChange={(e) => setNewTask({ ...newTask, endTime: e.target.value })}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Task</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskCalendar;
