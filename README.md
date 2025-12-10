# Student Record Management System (SRMS)

A modern, browser-based **Student Record Management System** that simulates a real-world academic records portal.  
It supports role-based access, secure login, student record management, analytics, and CSV export — all powered by **HTML, CSS, and JavaScript (ES6+)** using `localStorage` for persistence.

> Repository: `Coding-Skills` – SRMS Web Application

---

## 🚀 Features

### 🔐 Authentication & Roles
- **Role-Based Access Control (RBAC)**:
  - **Admin** – full access (manage users & records, reset system)
  - **Staff** – manage student records
  - **Guest** – view-only / limited actions
- Built-in **demo credentials** for quick testing:
  - `admin / admin123`
  - `staff / staff123`
  - `guest / guest`

### 📚 Student Record Management
- **Add New Record**  
  Store roll number, name, branch, section, and marks.
- **View All Records**  
  Tabular view of registered students.
- **Search Records**  
  Search by **Roll Number** or **Name**.
- **Edit & Update**  
  Modify existing student details.
- **Delete Records**  
  Remove records with confirmation dialog.

### 📊 Dashboard & Analytics
- **Dashboard Overview**:
  - Total number of students
  - Average marks
  - Pass percentage
- **Automatic Grade Calculation**:
  - Grade is calculated from marks (`O`, `A+`, `A`, `B+`, `B`, `F`).

### 📤 Data Export & System Utilities
- **Export to CSV**  
  Download all student records as a `.csv` file.
- **System Logs**  
  Every important action (login, create, update, delete, export, logout) is stored using a custom `Logger` class.
- **Factory Reset**  
  One-click **Hard Reset** to clear all `localStorage` data and reload the app.

### 🤖 AI Scan (UI Simulation)
- **Scan Student Record (AI-Powered Data Extraction – UI concept)**:
  - Upload a screenshot of a mark sheet (UI simulation).
  - Shows a mock “Scanning…” and “Extraction Complete” flow.
  - Designed to demonstrate how AI-based extraction could fit into SRMS.

---

## 🧠 Data Structures & Core Logic

The project focuses on **clean JavaScript logic and basic DSA concepts**:

- **Arrays of Objects**
  - Student records are stored as an array of student objects:
    ```js
    { roll, name, branch, sec, marks }
    ```
  - Operations like add, update, delete, search work directly on this array.

- **Searching**
  - Search uses `Array.prototype.filter` to perform **linear search** on roll number and name.

- **Logging System**
  - Logs are stored as an array of log objects:
    ```js
    { time, user, action, detail }
    ```
  - New logs are added to the **front** of the array using `unshift` (recent logs on top).

- **Local Storage Persistence**
  - `localStorage` is used to persist:
    - Credentials
    - Student records
    - System logs

- **Grade Calculation Logic**
  - A simple function maps marks to grade using conditional checks.

This makes it a good project to demonstrate **DSA usage, OOP in JS, and state management in the browser** for viva / interviews.

---

## 🛠️ Tech Stack

- **Frontend**
  - HTML5
  - Tailwind-based utility classes + custom CSS (`styles.css`)
  - Vanilla JavaScript (ES6+ classes & modules in a single `script.js`)

- **Storage**
  - Browser `localStorage` (no backend required)

---

## 📁 Project Structure

```bash
Coding-Skills/
├── index.html      # Main SRMS UI (login, dashboard, forms, tables, scanner section)
├── script.js       # Core logic: Auth, Logger, StudentSystem, UI handlers
├── styles.css      # Background, glassmorphism, animations, hover effects
└── README.md       # Project documentation
