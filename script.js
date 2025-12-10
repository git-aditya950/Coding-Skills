// ==========================================
//  GLOBAL UTILS & RESET
// ==========================================

window.hardReset = () => {
    if(confirm("Factory Reset: This will clear all data. Continue?")) {
        localStorage.clear();
        window.location.reload();
    }
};

// ==========================================
//  0. LOGGER
// ==========================================
class Logger {
    constructor() {
        this.logs = JSON.parse(localStorage.getItem('srms_logs')) || [];
    }
    
    log(action, user, detail) {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
        const entry = { time: timestamp, user: user ? user.toUpperCase() : 'SYSTEM', action, detail };
        this.logs.unshift(entry);
        if(this.logs.length > 50) this.logs.pop();
        localStorage.setItem('srms_logs', JSON.stringify(this.logs));
    }

    getLogs() { return this.logs; }

    clear() {
        this.logs = [];
        localStorage.setItem('srms_logs', JSON.stringify([]));
        ui.renderLogs();
    }
}

// ==========================================
//  1. AUTHENTICATION
// ==========================================
class Auth {
    constructor() {
        this.currentUser = null;
        this.role = null;
        this.credentials = this.loadCredentials();
    }

    loadCredentials() {
        try {
            const stored = localStorage.getItem('srms_creds');
            if (stored) return JSON.parse(stored);
        } catch (e) { console.error("Creds corrupted"); }
        
        const defaults = [
            { user: 'admin', pass: 'admin123', role: 'admin' },
            { user: 'staff', pass: 'staff123', role: 'staff' },
            { user: 'guest', pass: 'guest', role: 'guest' }
        ];
        localStorage.setItem('srms_creds', JSON.stringify(defaults));
        return defaults;
    }

    login(selectedRole, user, pass) {
        const account = this.credentials.find(c => c.user === user && c.pass === pass);
        if (account) {
            if (account.role === selectedRole) {
                this.currentUser = account.user;
                this.role = account.role;
                logger.log("LOGIN", this.currentUser, "Access granted.");
                return { success: true };
            } else {
                return { success: false, msg: `User '${user}' is a ${account.role.toUpperCase()}.` };
            }
        }
        return { success: false, msg: "Invalid Username or Password." };
    }

    changePassword(oldPass, newPass) {
        const index = this.credentials.findIndex(c => c.user === this.currentUser);
        if (index !== -1 && this.credentials[index].pass === oldPass) {
            this.credentials[index].pass = newPass;
            localStorage.setItem('srms_creds', JSON.stringify(this.credentials));
            logger.log("SECURITY", this.currentUser, "Password updated.");
            return true;
        }
        return false;
    }

    logout() {
        logger.log("LOGOUT", this.currentUser, "Session ended.");
        this.currentUser = null;
        this.role = null;
        ui.showLogin();
    }
}

// ==========================================
//  2. STUDENT DATA MANAGEMENT
// ==========================================
class StudentSystem {
    constructor() {
        this.students = this.loadStudents();
    }

    loadStudents() {
        try {
            const stored = localStorage.getItem('srms_students');
            if (stored) {
                let data = JSON.parse(stored);
                if(data.length > 0 && data[0].marks === undefined) throw new Error();
                return data;
            }
        } catch (e) {}
        
        const defaults = [
            { roll: 'AP24110010453', name: 'Pavan Varma', branch: 'CSE', sec: 'O', marks: 95 },
            { roll: 'AP24110010400', name: 'Rahul Sharma', branch: 'ECE', sec: 'A', marks: 82 }
        ];
        localStorage.setItem('srms_students', JSON.stringify(defaults));
        return defaults;
    }

    save() {
        localStorage.setItem('srms_students', JSON.stringify(this.students));
        ui.updateStats();
    }

    add(roll, name, branch, sec, marks) {
        if (this.students.some(s => s.roll === roll)) return false; 
        this.students.push({ roll, name, branch, sec, marks: parseInt(marks) });
        this.save();
        logger.log("CREATE", auth.currentUser, `New Record: ${roll}`);
        return true;
    }

    delete(roll) {
        const initialLen = this.students.length;
        this.students = this.students.filter(s => s.roll !== roll);
        this.save();
        logger.log("DELETE", auth.currentUser, `Removed: ${roll}`);
        return this.students.length < initialLen;
    }

    update(originalRoll, name, branch, marks) {
        const student = this.students.find(s => s.roll === originalRoll);
        if (student) {
            student.name = name;
            student.branch = branch;
            student.marks = parseInt(marks);
            this.save();
            logger.log("UPDATE", auth.currentUser, `Modified: ${originalRoll}`);
            return true;
        }
        return false;
    }

    search(query) {
        query = query.toLowerCase();
        return this.students.filter(s => 
            s.roll.toLowerCase().includes(query) || 
            s.name.toLowerCase().includes(query)
        );
    }

    calculateGrade(marks) {
        if (marks >= 90) return 'O';
        if (marks >= 80) return 'A+';
        if (marks >= 70) return 'A';
        if (marks >= 60) return 'B+';
        if (marks >= 50) return 'B';
        return 'F';
    }

    exportData() {
        let csvContent = "data:text/csv;charset=utf-8,Roll Number,Name,Branch,Section,Marks,Grade\n";
        this.students.forEach(s => {
            csvContent += `${s.roll},${s.name},${s.branch},${s.sec},${s.marks},${this.calculateGrade(s.marks)}\n`;
        });
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "student_records.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        logger.log("EXPORT", auth.currentUser, "Data exported to CSV.");
    }
}

// ==========================================
//  3. UI CONTROLLER
// ==========================================
class UI {
    constructor() {
        this.loginSection = document.getElementById('login-section');
        this.dashboardSection = document.getElementById('dashboard-section');
        this.menuContainer = document.getElementById('menu-container');
        this.deleteTarget = null;
    }

    showLogin() {
        this.loginSection.classList.remove('hidden');
        this.dashboardSection.classList.add('hidden');
        document.getElementById('login-form').reset();
        document.getElementById('login-msg').classList.add('hidden');
    }

    showDashboard(role) {
        this.loginSection.classList.add('hidden');
        this.dashboardSection.classList.remove('hidden');
        document.getElementById('current-role-display').textContent = role;
        this.generateMenu(role);
        
        if(role === 'guest') this.showSection('view');
        else this.showSection('dashboard');
        
        this.updateStats();
    }

    generateMenu(role) {
        let menuHTML = '';
        const baseClass = "w-full text-left px-4 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white text-sm font-medium transition-all flex items-center gap-3 group";
        const iconBase = "w-5 text-slate-500 group-hover:text-brand-400 transition-colors";

        if (role === 'admin') {
            menuHTML += `<button onclick="ui.showSection('dashboard')" class="${baseClass}"><i class="fa-solid fa-gauge-high ${iconBase}"></i> Dashboard</button>`;
            menuHTML += `<button onclick="ui.showSection('add')" class="${baseClass}"><i class="fa-solid fa-user-plus ${iconBase}"></i> Add Student</button>`;
            menuHTML += `<button onclick="ui.showSection('view')" class="${baseClass}"><i class="fa-solid fa-list-check ${iconBase}"></i> Records</button>`;
            menuHTML += `<button onclick="ui.showSection('scan')" class="${baseClass}"><i class="fa-solid fa-camera ${iconBase}"></i> Scan Record</button>`;
            menuHTML += `<button onclick="ui.showSection('search')" class="${baseClass}"><i class="fa-solid fa-magnifying-glass ${iconBase}"></i> Search</button>`;
            menuHTML += `<button onclick="ui.showSection('password')" class="${baseClass}"><i class="fa-solid fa-key ${iconBase}"></i> Security</button>`;
        }
        else if (role === 'staff') {
            menuHTML += `<button onclick="ui.showSection('dashboard')" class="${baseClass}"><i class="fa-solid fa-gauge-high ${iconBase}"></i> Dashboard</button>`;
            menuHTML += `<button onclick="ui.showSection('add')" class="${baseClass}"><i class="fa-solid fa-user-plus ${iconBase}"></i> Add Student</button>`;
            menuHTML += `<button onclick="ui.showSection('view')" class="${baseClass}"><i class="fa-solid fa-list-check ${iconBase}"></i> Records</button>`;
            menuHTML += `<button onclick="ui.showSection('scan')" class="${baseClass}"><i class="fa-solid fa-camera ${iconBase}"></i> Scan Record</button>`;
            menuHTML += `<button onclick="ui.showSection('search')" class="${baseClass}"><i class="fa-solid fa-magnifying-glass ${iconBase}"></i> Search</button>`;
        }
        else if (role === 'guest') {
            menuHTML += `<button onclick="ui.showSection('view')" class="${baseClass}"><i class="fa-solid fa-list-check ${iconBase}"></i> Records</button>`;
            menuHTML += `<button onclick="ui.showSection('search')" class="${baseClass}"><i class="fa-solid fa-magnifying-glass ${iconBase}"></i> Search</button>`;
        }
        this.menuContainer.innerHTML = menuHTML;
    }

    showSection(secId) {
        document.querySelectorAll('.content-sec').forEach(el => el.classList.add('hidden'));
        const sec = document.getElementById(`sec-${secId}`);
        if(sec) {
            sec.classList.remove('hidden');
            if (secId === 'view') this.renderTable();
            if (secId === 'logs') this.renderLogs();
        }
    }

    // SCANNING LOGIC
    handleFileUpload(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('upload-prompt').classList.add('hidden');
                const img = document.getElementById('preview-img');
                img.src = e.target.result;
                img.classList.remove('hidden');
                
                // Start Simulation
                document.getElementById('scan-overlay').classList.remove('hidden');
                setTimeout(() => {
                    this.finishScanning();
                }, 2500); // 2.5s simulated delay
            };
            reader.readAsDataURL(input.files[0]);
        }
    }

    finishScanning() {
        document.getElementById('scan-overlay').classList.add('hidden');
        
        // Generate Dummy Subject Breakdown
        const subjects = [
            { name: "C Programming", marks: Math.floor(Math.random() * (100 - 60) + 60) },
            { name: "Mathematics", marks: Math.floor(Math.random() * (100 - 60) + 60) },
            { name: "Physics", marks: Math.floor(Math.random() * (100 - 60) + 60) },
            { name: "English", marks: Math.floor(Math.random() * (100 - 60) + 60) }
        ];

        // Calculate Average
        const total = subjects.reduce((sum, sub) => sum + sub.marks, 0);
        const average = Math.round(total / subjects.length);
        const grade = system.calculateGrade(average);

        const rnd = Math.floor(Math.random() * 1000);
        const dummyData = {
            roll: `AP24${rnd}`,
            name: "Extracted Student Name",
            branch: "CSE",
            sec: "B"
        };

        // Populate Fields
        document.getElementById('scan-roll').value = dummyData.roll;
        document.getElementById('scan-name').value = dummyData.name;
        document.getElementById('scan-branch').value = dummyData.branch;
        document.getElementById('scan-sec').value = dummyData.sec;
        document.getElementById('scan-grade').value = grade;
        
        // Store actual calculated marks for saving
        document.getElementById('scan-final-marks').value = average; 
        document.getElementById('scan-total-marks').textContent = `${average} (Avg)`;

        // Populate Table
        const tbody = document.getElementById('scan-subjects-body');
        tbody.innerHTML = '';
        subjects.forEach(sub => {
            tbody.innerHTML += `
                <tr class="border-b border-slate-50 last:border-none">
                    <td class="px-4 py-2 font-medium text-slate-600">${sub.name}</td>
                    <td class="px-4 py-2 text-right font-mono font-bold text-slate-700">${sub.marks}</td>
                </tr>
            `;
        });

        document.getElementById('scan-result').classList.remove('hidden');
    }

    resetScan() {
        document.getElementById('file-upload').value = '';
        document.getElementById('preview-img').classList.add('hidden');
        document.getElementById('upload-prompt').classList.remove('hidden');
        document.getElementById('scan-result').classList.add('hidden');
    }

    saveScannedData() {
        const roll = document.getElementById('scan-roll').value;
        const name = document.getElementById('scan-name').value;
        const branch = document.getElementById('scan-branch').value;
        const sec = document.getElementById('scan-sec').value;
        const marks = document.getElementById('scan-final-marks').value; // Use calculated avg

        if (system.add(roll, name, branch, sec, marks)) {
            alert("Record saved successfully!");
            this.resetScan();
            this.showSection('view'); 
        } else {
            alert("Error: Roll Number already exists.");
        }
    }

    updateStats() {
        const students = system.students;
        const total = students.length;
        let totalMarks = 0;
        let passCount = 0;
        let topStudent = null;

        students.forEach(s => {
            const m = s.marks || 0;
            totalMarks += m;
            if(m >= 50) passCount++;
            if(!topStudent || m > topStudent.marks) topStudent = s;
        });

        document.getElementById('stat-total-students').textContent = total;
        document.getElementById('stat-avg-marks').textContent = total > 0 ? (totalMarks / total).toFixed(1) : 0;
        document.getElementById('stat-pass-perc').textContent = total > 0 ? ((passCount / total) * 100).toFixed(0) + '%' : '0%';

        const topCard = document.getElementById('top-performer-card');
        if(topStudent) {
            topCard.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 font-bold border border-yellow-200 text-lg shadow-sm">
                        ${topStudent.name.charAt(0)}
                    </div>
                    <div>
                        <p class="font-bold text-slate-800 text-base">${topStudent.name}</p>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">${topStudent.branch}</span>
                            <span class="text-xs font-bold text-brand-600">${topStudent.marks} Marks</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            topCard.innerHTML = '<p class="text-slate-400 italic text-sm">Not enough data available.</p>';
        }
    }

    renderLogs() {
        const container = document.getElementById('log-container');
        const logs = logger.getLogs();
        if(logs.length === 0) {
            container.innerHTML = '<p class="text-slate-600 italic text-center py-4">Terminal is empty.</p>';
            return;
        }
        container.innerHTML = logs.map(l => `
            <div class="flex gap-3 text-slate-400 font-mono hover:text-slate-200 transition-colors py-0.5 border-b border-slate-800/50">
                <span class="text-slate-600 w-20 shrink-0">${l.time}</span>
                <span class="text-brand-400 w-16 shrink-0 font-bold">[${l.user}]</span>
                <span class="text-emerald-400 w-20 shrink-0 font-bold">${l.action}</span>
                <span>${l.detail}</span>
            </div>
        `).join('');
    }

    renderTable() {
        const tbody = document.getElementById('student-table-body');
        tbody.innerHTML = '';
        
        if (system.students.length === 0) {
            document.getElementById('empty-state').classList.remove('hidden');
            return;
        }
        document.getElementById('empty-state').classList.add('hidden');

        system.students.forEach(s => {
            let actions = '';
            const grade = system.calculateGrade(s.marks);
            
            let gradeColor = 'bg-slate-100 text-slate-600';
            if (grade === 'O') gradeColor = 'bg-emerald-100 text-emerald-700 border border-emerald-200';
            else if (grade === 'A+' || grade === 'A') gradeColor = 'bg-blue-100 text-blue-700 border border-blue-200';
            else if (grade === 'F') gradeColor = 'bg-red-100 text-red-700 border border-red-200';
            else gradeColor = 'bg-yellow-50 text-yellow-700 border border-yellow-200';

            let gradeBadge = `<span class="px-2.5 py-1 rounded-md text-xs font-bold ${gradeColor}">${grade}</span>`;

            if (auth.role === 'admin') {
                actions = `
                    <button onclick="ui.openEditModal('${s.roll}')" class="text-blue-600 hover:text-blue-800 mx-1 p-2 hover:bg-blue-50 rounded-lg transition-all" title="Update"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="ui.openDeleteModal('${s.roll}')" class="text-red-500 hover:text-red-700 mx-1 p-2 hover:bg-red-50 rounded-lg transition-all" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                `;
            } 
            else if (auth.role === 'staff') {
                actions = `
                    <button onclick="ui.openEditModal('${s.roll}')" class="text-blue-600 hover:text-blue-800 mx-1 p-2 hover:bg-blue-50 rounded-lg transition-all" title="Update"><i class="fa-solid fa-pen"></i></button>
                `;
            }
            else {
                actions = '<span class="text-slate-400 text-xs italic bg-slate-50 px-2 py-1 rounded">Read Only</span>';
            }

            const row = `
                <tr class="hover:bg-slate-50 border-b border-slate-50 last:border-none transition-colors group">
                    <td class="px-6 py-4 font-mono text-xs font-bold text-slate-500 group-hover:text-brand-600 transition-colors">${s.roll}</td>
                    <td class="px-6 py-4 font-bold text-slate-700">${s.name}</td>
                    <td class="px-6 py-4 text-center text-xs text-slate-500">${s.branch} (${s.sec})</td>
                    <td class="px-6 py-4 text-center font-bold text-slate-700 font-mono">${s.marks}</td>
                    <td class="px-6 py-4 text-center">${gradeBadge}</td>
                    <td class="px-6 py-4 text-right">${actions}</td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    }

    openDeleteModal(roll) {
        this.deleteTarget = roll;
        document.getElementById('delete-target-roll').textContent = roll;
        document.getElementById('delete-modal').classList.remove('hidden');
    }

    closeDeleteModal() {
        this.deleteTarget = null;
        document.getElementById('delete-modal').classList.add('hidden');
    }

    confirmDeleteAction() {
        if (this.deleteTarget) {
            system.delete(this.deleteTarget);
            this.renderTable();
            this.closeDeleteModal();
        }
    }

    openEditModal(roll) {
        const s = system.students.find(st => st.roll === roll);
        if (!s) return;
        document.getElementById('edit-original-roll').value = s.roll;
        document.getElementById('edit-roll').value = s.roll;
        document.getElementById('edit-name').value = s.name;
        document.getElementById('edit-branch').value = s.branch;
        document.getElementById('edit-marks').value = s.marks;
        document.getElementById('edit-modal').classList.remove('hidden');
    }

    closeEditModal() {
        document.getElementById('edit-modal').classList.add('hidden');
    }

    renderSearchResults(results) {
        const tbody = document.getElementById('search-table-body');
        tbody.innerHTML = '';
        const msg = document.getElementById('search-msg');
        const tableContainer = document.getElementById('search-results');

        if (results.length === 0) {
            msg.classList.remove('hidden');
            tableContainer.classList.add('hidden');
        } else {
            msg.classList.add('hidden');
            tableContainer.classList.remove('hidden');
            results.forEach(s => {
                const grade = system.calculateGrade(s.marks);
                tbody.insertAdjacentHTML('beforeend', `
                    <tr class="border-b last:border-none hover:bg-slate-50">
                        <td class="px-6 py-4 font-mono text-xs font-bold text-slate-500">${s.roll}</td>
                        <td class="px-6 py-4 font-bold text-slate-800">${s.name}</td>
                        <td class="px-6 py-4 text-sm text-slate-500">
                            <div class="flex flex-col">
                                <span class="font-bold text-slate-700">${s.branch} - Sec ${s.sec}</span>
                                <span class="text-xs">Marks: ${s.marks} (Grade: ${grade})</span>
                            </div>
                        </td>
                    </tr>
                `);
            });
        }
    }
}

// ==========================================
//  INIT
// ==========================================
const logger = new Logger();
const auth = new Auth();
const system = new StudentSystem();
const ui = new UI();

// Event Listeners
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const role = document.getElementById('login-role').value;
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value.trim();
    const msg = document.getElementById('login-msg');
    const msgText = document.getElementById('login-msg-text');
    
    if(!role) {
        msgText.textContent = "Please select a User Role.";
        msg.classList.remove('hidden');
        return;
    }

    const result = auth.login(role, u, p);

    if (result.success) {
        msg.classList.add('hidden');
        ui.showDashboard(auth.role);
    } else {
        msgText.textContent = result.msg;
        msg.classList.remove('hidden');
    }
});

document.getElementById('add-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const roll = document.getElementById('add-roll').value;
    const name = document.getElementById('add-name').value;
    const branch = document.getElementById('add-branch').value;
    const sec = document.getElementById('add-sec').value || '-';
    const marks = document.getElementById('add-marks').value;
    const msg = document.getElementById('add-msg');

    if (system.add(roll, name, branch, sec, marks)) {
        msg.textContent = "Success! Record added to database.";
        msg.className = "mt-6 p-4 text-center text-sm font-medium rounded-xl border bg-emerald-50 text-emerald-600 border-emerald-100";
        msg.classList.remove('hidden');
        e.target.reset();
        setTimeout(() => msg.classList.add('hidden'), 3000);
    } else {
        msg.textContent = "Error: Roll Number already exists.";
        msg.className = "mt-6 p-4 text-center text-sm font-medium rounded-xl border bg-red-50 text-red-600 border-red-100";
        msg.classList.remove('hidden');
    }
});

document.getElementById('edit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const roll = document.getElementById('edit-original-roll').value;
    const name = document.getElementById('edit-name').value;
    const branch = document.getElementById('edit-branch').value;
    const marks = document.getElementById('edit-marks').value;
    
    system.update(roll, name, branch, marks);
    ui.closeEditModal();
    ui.renderTable(); 
});

// NOTE: this line is exactly as in your original code
system.search = () => {
    const q = document.getElementById('search-input').value.trim();
    if(!q) return;
    const results = system.search(q);
    ui.renderSearchResults(results);
};

document.getElementById('pwd-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const oldP = document.getElementById('old-pass').value;
    const newP = document.getElementById('new-pass').value;
    const msg = document.getElementById('pwd-msg');

    if (auth.changePassword(oldP, newP)) {
        msg.textContent = "Password updated successfully.";
        msg.className = "mt-6 p-4 text-center text-sm font-medium rounded-xl border bg-emerald-50 text-emerald-600 border-emerald-100";
        msg.classList.remove('hidden');
        e.target.reset();
    } else {
        msg.textContent = "Authentication Failed: Old password incorrect.";
        msg.className = "mt-6 p-4 text-center text-sm font-medium rounded-xl border bg-red-50 text-red-600 border-red-100";
        msg.classList.remove('hidden');
    }
});
