# Student Record Management System (SRMS)

A comprehensive Student Record Management System with both console-based C++ implementation and web-based interface.

## Features

- **Role-Based Access Control**: Admin, Staff, and Guest roles with different permissions
- **CRUD Operations**: Create, Read, Update, and Delete student records
- **Search Functionality**: Search students by Roll Number or Name
- **Data Export**: Export records to CSV format
- **Persistent Storage**: LocalStorage for web version
- **Analytics Dashboard**: View statistics like total students, average marks, and pass rate

## Technologies Used

### Web Version
- HTML5
- CSS3 (Tailwind CSS)
- JavaScript (ES6+)
- LocalStorage API

### C++ Version
- C++ with Singly Linked List
- File I/O Operations
- Dynamic Memory Management

## Getting Started

### Web Version
1. Open `index.html` in a web browser
2. Login with default credentials:
   - Admin: `admin/admin123`
   - Staff: `staff/staff123`
   - Guest: `guest/guest`

### C++ Version
1. Compile: `g++ project.cpp -o student_report.exe`
2. Run: `.\student_report.exe`

## Project Structure

```
├── index.html          # Web-based SRMS interface
├── project.cpp         # C++ console application
└── README.md          # Project documentation
```

## Author

Aditya

## License

This project is open source and available for educational purposes.
