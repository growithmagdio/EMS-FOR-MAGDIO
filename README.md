# 🏢 MAGDIO EMS - Employee & Client Management System

MAGDIO EMS is a comprehensive, modern **Employee & Client Management System** built for web and desktop (Electron). It streamlines workforce operations, project workflows, task assignments, daily attendance, leave management, and client tracking in a real-time dashboard interface.

---

## 🌟 Key Features

### 👑 Admin Management Portal
- **Dashboard Overview**: Real-time monitoring of workforce activity, attendance metrics, and project progression.
- **Employee Management**: Seamlessly add, edit, activate/deactivate, and manage employee profiles and permissions.
- **Client Management**: Track clients, contact persons, active contracts, and project links.
- **Project & Task Management**: Create projects, assign tasks to team members with priorities, deadlines, and status tracking.
- **Attendance Monitoring**: Real-time logs of daily clock-in/out times, break durations, and working hours.
- **Leave & Request Approvals**: Centralized hub to review and approve or decline leave applications and special requests.
- **Daily Work Reports**: Review structured end-of-day reports submitted by employees.

---

### 👨‍💻 Employee Portal
- **Interactive Dashboard**: Personal overview of assigned work, upcoming deadlines, and current status.
- **Attendance Logger**: One-click daily Clock-in / Clock-out and break tracking.
- **Task & Project Tracker**: Manage assigned tasks, update progress statuses (Pending, In Progress, Completed), and review project details.
- **Daily Report Submissions**: Submit daily work logs detailing accomplishments and blockers.
- **Leave & Administrative Requests**: Submit leave requests or resource requests directly to management.

---

### 🌐 Public Client Tracking
- **Public Project Status Page**: Share live, read-only project progress pages with clients without requiring full system access.

---

## 🛠️ Technology Stack

| Category | Technology |
| :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) + [Vite 8](https://vitejs.dev/) |
| **Desktop Wrapper** | [Electron 43](https://www.electronjs.org/) + [Electron Builder](https://www.electron.build/) |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide React Icons](https://lucide.dev/) |
| **Backend Services** | [Firebase](https://firebase.google.com/) (Auth & Cloud Firestore) |
| **Form & State Management** | [React Router v7](https://reactrouter.com/), [React Hook Form](https://react-hook-form.com/), [React Hot Toast](https://react-hot-toast.com/) |

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) package manager

### 1. Clone the Repository
```bash
git clone https://github.com/growithmagdio/EMS-FOR-MAGDIO.git
cd EMS-FOR-MAGDIO
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Firebase Environment
Ensure your Firebase configuration is set up in `src/firebase/config.js`.

### 4. Run Development Servers

**Web Application (Vite Dev Server):**
```bash
npm run dev
```

**Desktop Application (Electron Dev Mode):**
```bash
npm run electron:dev
```

---

## 📦 Building & Packaging

### Production Web Build
```bash
npm run build
```

### Desktop Application Builds (Windows Portable & Installer)
```bash
# Build desktop app binaries (Outputs to dist-electron/)
npm run electron:dist
```

---

## 📁 Repository Directory Structure

```
MAGDIO/
├── main.cjs                # Electron Main Process entry point
├── index.html              # Web app HTML template
├── package.json            # Project dependencies & build scripts
├── src/
│   ├── assets/             # Media and visual assets
│   ├── components/         # Reusable UI components (Task Cards, Modals, Navbar, etc.)
│   ├── context/            # React Context providers (Auth, Theme, App state)
│   ├── firebase/           # Firebase SDK initialization and helpers
│   ├── pages/
│   │   ├── Login.jsx       # User authentication entry
│   │   ├── Register.jsx    # New user onboarding
│   │   ├── PublicProjectStatus.jsx # Client project status view
│   │   ├── admin/          # Admin management dashboards
│   │   └── employee/       # Employee dashboards & task tracking
│   └── utils/              # Helper functions & date formatting utilities
└── dist-electron/          # Built Electron desktop executables
```

---

## 📄 License

This project is proprietary and maintained for **MAGDIO**. All rights reserved.