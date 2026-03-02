"use client"

import React, { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectGroup, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Task {
  title: string;
  description: string;
  dueDate: Date;
  priority: string;
  status: string;
}

const TaskCalendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [taskForm, setTaskForm] = useState<Task>({
    title: "",
    description: "",
    dueDate: new Date(),
    priority: "medium",
    status: "pending"
  })

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Task submitted:", taskForm)
    setTaskForm({
      title: "",
      description: "",
      dueDate: new Date(),
      priority: "medium",
      status: "pending"
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setTaskForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-background rounded-lg border">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
          />
        </div>
        
        <div className="p-4 bg-background rounded-lg border">
          <form onSubmit={handleTaskSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                name="title"
                value={taskForm.title}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={taskForm.description}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                name="priority" 
                defaultValue={taskForm.priority}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectGroup>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </SelectGroup>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                name="status" 
                defaultValue={taskForm.status}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectGroup>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </SelectGroup>
              </Select>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 text-white bg-primary rounded-md hover:bg-primary/90"
            >
              Add Task
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default TaskCalendar