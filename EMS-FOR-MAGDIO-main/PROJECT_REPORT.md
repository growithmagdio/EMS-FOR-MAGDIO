# MAGDIO Employee Management System (EMS)

## Overview
MAGDIO is a comprehensive Employee Management System built using React, Vite, TailwindCSS, and Firebase. It features a dual-role architecture (Admin and Employee) to streamline daily operations, task management, reporting, and team communication.

## Key Features

### 1. Role-Based Access Control
- **Admin Portal:** Full access to manage employees, clients, projects, tasks, and view all company-wide reports.
- **Employee Portal:** Focused workspace for daily task execution, reporting, leave applications, and personal task management.

### 2. Task & Project Management
- **Admin Delegation:** Admins can create projects and assign specific tasks to employees with priorities and due dates.
- **Kanban Board:** Employees view their tasks in a categorized board (To Do, In Progress, Review, Done).
- **Personal Tasks:** Employees can create and manage their own personal tasks alongside assigned work.

### 3. Daily Reporting System
- **Task-Linked Reports:** Employees submit daily reports linked directly to the tasks they worked on.
- **Automated Progress Tracking:** Submitting a report automatically updates the completion percentage of the linked task.
- **Admin Monitoring:** Admins can view today's reports for all employees to track productivity and blockers.

### 4. Leave & WFH Management
- **Employee Requests:** Employees can request Leave or Work From Home directly from their dashboard.
- **Leave Balances:** The system tracks and automatically deducts from an employee's leave balance upon admin approval.
- **Admin Review:** Admins can approve or reject requests, and manage leave balances dynamically.

### 5. Client Management
- **CRM Lite:** Admins can maintain a database of clients (Name, Company, Contact info) to assign to projects.
- *Note: Clients do not have login access to the system.*

### 6. Team Communication
- **Real-Time Chat:** A built-in Firestore-powered team chat allowing instant communication between all members of the organization.

### 7. Data Safety (Soft Deletion)
- **Non-Destructive Deletes:** Deleting records (employees, projects, tasks) does not permanently erase them from the database, preventing data corruption and preserving historical reports.

## Technology Stack
- **Frontend Framework:** React (Vite)
- **Styling:** TailwindCSS, Lucide React (Icons)
- **Database & Authentication:** Firebase (Firestore, Auth)
- **Forms & State:** React Hook Form, React Hot Toast
