// Authentication Manager
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.users = this.loadUsers();
        this.setupEventListeners();
        this.checkSession();
    }

    loadUsers() {
        try {
            const users = JSON.parse(localStorage.getItem('users'));
            return users || {};
        } catch (error) {
            console.error('Error loading users:', error);
            return {};
        }
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register form
        const registerForm = document.getElementById('register');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // Form switching
        const showRegister = document.getElementById('show-register');
        const showLogin = document.getElementById('show-login');
        
        if (showRegister) {
            showRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleForms('register');
            });
        }
        
        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleForms('login');
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Password toggles
        document.querySelectorAll('.toggle-password').forEach(button => {
            button.addEventListener('click', (e) => {
                const input = e.target.closest('.password-input').querySelector('input');
                const icon = e.target.closest('.toggle-password').querySelector('i');
                
                if (input && icon) {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
                }
            });
        });
    }

    checkSession() {
        const sessionUser = localStorage.getItem('currentUser');
        if (sessionUser && this.users[sessionUser]) {
            this.currentUser = sessionUser;
            this.showApp();
        } else {
            this.hideApp();
        }
    }

    handleLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            this.showToast('Please fill in all fields');
            return;
        }

        if (this.validateLogin(username, password)) {
            this.currentUser = username;
            localStorage.setItem('currentUser', username);
            this.showApp();
            this.showToast(`Welcome back, ${username}!`);
        } else {
            this.showToast('Invalid username or password');
        }
    }

    handleRegister() {
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;

        if (!username || !password || !confirmPassword) {
            this.showToast('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match');
            return;
        }

        if (this.users[username]) {
            this.showToast('Username already exists');
            return;
        }

        this.users[username] = {
            password: this.hashPassword(password),
            tasks: []
        };

        localStorage.setItem('users', JSON.stringify(this.users));
        this.currentUser = username;
        localStorage.setItem('currentUser', username);
        this.showApp();
        this.showToast('Account created successfully!');
    }

    handleLogout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.hideApp();
        this.showToast('Logged out successfully');
        
        // Reset forms
        document.getElementById('login').reset();
        document.getElementById('register').reset();
        
        // Show login form
        this.toggleForms('login');
    }

    validateLogin(username, password) {
        const user = this.users[username];
        return user && user.password === this.hashPassword(password);
    }

    hashPassword(password) {
        // In a real application, use a proper hashing algorithm
        return btoa(password);
    }

    toggleForms(show = 'login') {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (show === 'register') {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        } else {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        }
    }

    showApp() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        document.getElementById('user-welcome').textContent = `Welcome, ${this.currentUser}!`;
        
        if (this.users[this.currentUser]) {
            if (window.taskManager) {
                window.taskManager.tasks = this.users[this.currentUser].tasks || [];
                window.taskManager.renderTasks();
                window.taskManager.updateDashboardStats();
            }
        }
    }

    hideApp() {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    }

    saveUserTasks(tasks) {
        if (this.currentUser && this.users[this.currentUser]) {
            this.users[this.currentUser].tasks = tasks;
            localStorage.setItem('users', JSON.stringify(this.users));
        }
    }
}

// Task Management
class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.loadTasks();
        this.setupEventListeners();
    }

    loadTasks() {
        try {
            if (window.authManager && window.authManager.currentUser) {
                const userTasks = window.authManager.users[window.authManager.currentUser]?.tasks || [];
                this.tasks = Array.isArray(userTasks) ? userTasks : [];
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.tasks = [];
        }
        this.renderTasks();
        this.updateCategories();
        this.updateDashboardStats();
    }

    setupEventListeners() {
        // Task form submission
        const taskForm = document.getElementById('task-form');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addTask();
            });
        }

        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.closest('.filter-btn').dataset.filter;
                if (filter) {
                    this.setFilter(filter);
                    
                    // Update active state
                    filterButtons.forEach(button => button.classList.remove('active'));
                    e.target.closest('.filter-btn').classList.add('active');
                }
            });
        });

        // Task checkbox and comment handlers
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // Handle task completion
            if (target.closest('.task-checkbox')) {
                const taskId = parseInt(target.closest('.task-item').dataset.id);
                this.toggleTaskComplete(taskId);
            }
            
            // Handle comments
            if (target.closest('.task-comment-btn')) {
                const taskId = parseInt(target.closest('.task-item').dataset.id);
                this.addComment(taskId);
            }
        });
    }

    addTask() {
        const newTask = {
            id: Date.now(),
            title: document.getElementById('task-title').value.trim(),
            description: document.getElementById('task-description').value.trim(),
            category: document.getElementById('task-category').value,
            priority: document.getElementById('task-priority').value,
            dueDate: document.getElementById('task-due-date').value,
            assignee: document.getElementById('task-assignee').value.trim(),
            completed: false,
            comments: [],
            createdAt: new Date().toISOString()
        };

        // Validate required fields
        if (!newTask.title || !newTask.category || !newTask.priority || !newTask.dueDate) {
            this.showToast('Please fill in all required fields');
            return;
        }

        this.tasks.push(newTask);
        this.saveTasks();
        this.renderTasks();
        this.updateCategories();
        this.updateDashboardStats();
        
        // Reset form and show success message
        document.getElementById('task-form').reset();
        this.showToast('Task added successfully!');
        this.switchSection('all-tasks');
    }

    renderTasks() {
        const filteredTasks = this.filterTasks();
        
        // Render active tasks
        const activeTasks = filteredTasks.filter(task => !task.completed);
        const activeTasksContainer = document.getElementById('active-tasks');
        if (activeTasksContainer) {
            activeTasksContainer.innerHTML = activeTasks.length ? 
                activeTasks.map(task => this.renderTaskElement(task)).join('') :
                '<div class="no-tasks">No active tasks found</div>';
        }

        // Render completed tasks
        const completedTasks = filteredTasks.filter(task => task.completed);
        const completedTasksContainer = document.getElementById('completed-tasks-list');
        if (completedTasksContainer) {
            completedTasksContainer.innerHTML = completedTasks.length ?
                completedTasks.map(task => this.renderTaskElement(task)).join('') :
                '<div class="no-tasks">No completed tasks</div>';
        }

        // Render team view
        const teamTasksContainer = document.getElementById('team-tasks');
        if (teamTasksContainer) {
            teamTasksContainer.innerHTML = this.tasks.length ?
                this.tasks.map(task => this.renderTaskElement(task, true)).join('') :
                '<div class="no-tasks">No tasks available</div>';
        }

        this.updateDashboardStats();
    }

    renderTaskElement(task, isTeamView = false) {
        const isOverdue = this.isOverdue(task.dueDate);
        const formattedDate = new Date(task.dueDate).toLocaleDateString();

        return `
            <div class="task-item ${task.completed ? 'completed' : ''} ${isOverdue && !task.completed ? 'overdue' : ''}"
                data-id="${task.id}"
                role="listitem">
                <div class="task-content">
                    <h3>${this.escapeHtml(task.title)}</h3>
                    <p>${this.escapeHtml(task.description || 'No description provided')}</p>
                    <div class="task-meta">
                        <span class="task-priority priority-${task.priority.toLowerCase()}">${task.priority}</span>
                        <span class="task-category"><i class="fas fa-folder"></i> ${this.escapeHtml(task.category)}</span>
                        <span class="task-date ${isOverdue ? 'overdue' : ''}">
                            <i class="fas fa-calendar"></i> ${formattedDate}
                        </span>
                        <span class="task-assignee">
                            <i class="fas fa-user"></i> ${this.escapeHtml(task.assignee || 'Unassigned')}
                        </span>
                    </div>
                </div>
                <div class="task-actions">
                    ${!task.completed && !isTeamView ? `
                        <button class="task-checkbox" aria-label="Mark task as complete">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    <button class="task-comment-btn" aria-label="Add comment">
                        <i class="fas fa-comment"></i>
                        <span class="comment-count">${task.comments.length}</span>
                    </button>
                </div>
            </div>
        `;
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    toggleTaskComplete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderTasks();
            this.updateCategories();
            this.showToast(task.completed ? 'Task completed!' : 'Task marked as incomplete');
        }
    }

    addComment(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            const comment = prompt('Enter your comment:');
            if (comment && comment.trim()) {
                task.comments.push({
                    text: comment.trim(),
                    timestamp: new Date().toISOString(),
                    author: window.authManager.currentUser
                });
                this.saveTasks();
                this.renderTasks();
                this.showToast('Comment added successfully');
            }
        }
    }

    filterTasks() {
        let filteredTasks = [...this.tasks];
        
        switch (this.currentFilter) {
            case 'category':
                filteredTasks.sort((a, b) => a.category.localeCompare(b.category));
                break;
            case 'priority':
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                filteredTasks.sort((a, b) => 
                    priorityOrder[a.priority.toLowerCase()] - priorityOrder[b.priority.toLowerCase()]
                );
                break;
            case 'date':
                filteredTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                break;
        }

        return filteredTasks;
    }

    updateCategories() {
        const categories = {};
        this.tasks.forEach(task => {
            if (!categories[task.category]) {
                categories[task.category] = { total: 0, completed: 0 };
            }
            categories[task.category].total++;
            if (task.completed) {
                categories[task.category].completed++;
            }
        });

        const categoryList = document.querySelector('.category-list');
        if (categoryList) {
            categoryList.innerHTML = Object.entries(categories).map(([category, stats]) => `
                <div class="category-item">
                    <h3>${this.escapeHtml(category)}</h3>
                    <p>${stats.completed}/${stats.total} tasks completed</p>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${(stats.completed / stats.total) * 100}%"></div>
                    </div>
                </div>
            `).join('') || '<div class="no-categories">No categories yet</div>';
        }
    }

    updateDashboardStats() {
        const stats = {
            total: this.tasks.length,
            completed: this.tasks.filter(t => t.completed).length,
            overdue: this.tasks.filter(t => !t.completed && this.isOverdue(t.dueDate)).length
        };

        // Update counters
        Object.entries(stats).forEach(([key, value]) => {
            const element = document.getElementById(`${key}-tasks-count`);
            if (element) element.textContent = value;
        });

        // Update progress bars
        const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
        const progressBars = document.querySelectorAll('.progress');
        if (progressBars[1]) {
            progressBars[1].style.width = `${completionRate}%`;
        }
    }

    isOverdue(dueDate) {
        return new Date(dueDate) < new Date();
    }

    saveTasks() {
        if (window.authManager && window.authManager.currentUser) {
            window.authManager.saveUserTasks(this.tasks);
        }
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.renderTasks();
    }

    switchSection(sectionId) {
        if (!sectionId) return;

        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');

            // Update navigation links
            document.querySelectorAll('.nav-links a').forEach(link => {
                const isActive = link.getAttribute('data-section') === sectionId;
                link.classList.toggle('active', isActive);
            });

            // Close mobile menu if open
            if (window.innerWidth <= 768) {
                const navLinks = document.querySelector('.nav-links');
                if (navLinks) {
                    navLinks.classList.remove('active');
                }
            }

            // Update URL hash without scrolling
            history.pushState(null, '', `#${sectionId}`);
        }
    }
}

// Mindfulness and Focus Features
class MindfulnessManager {
    constructor() {
        this.setupInitialState();
        this.setupEventListeners();
    }

    setupInitialState() {
        this.quotes = [
            { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
            { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
            { text: "Education is not preparation for life; education is life itself.", author: "John Dewey" },
            { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
            { text: "The mind is everything. What you think you become.", author: "Buddha" }
        ];
        
        this.focusTime = 25 * 60; // 25 minutes in seconds
        this.breakTime = 5 * 60;  // 5 minutes in seconds
        this.currentTime = this.focusTime;
        this.isBreak = false;
        this.isRunning = false;
        this.timer = null;
        this.totalFocusTime = parseInt(localStorage.getItem('totalFocusTime')) || 0;
        this.lastReminderTime = Date.now();

        this.updateTimerDisplay();
        this.updateProgress();
        this.setupQuotes();
        this.setupMindfulnessReminders();
    }

    setupEventListeners() {
        const startButton = document.getElementById('start-focus');
        if (startButton) {
            startButton.addEventListener('click', () => {
                if (!this.isRunning) {
                    this.startTimer();
                    startButton.textContent = 'Pause Session';
                    startButton.classList.add('active');
                } else {
                    this.pauseTimer();
                    startButton.textContent = 'Resume Session';
                    startButton.classList.remove('active');
                }
            });
        }

        // Close modal button
        const closeModalBtn = document.querySelector('.modal-close');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                const modal = document.getElementById('mindfulness-modal');
                if (modal) {
                    modal.classList.remove('show');
                }
            });
        }
    }

    startTimer() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.timer = setInterval(() => {
                this.currentTime--;
                this.updateTimerDisplay();

                if (this.currentTime <= 0) {
                    this.handleTimerComplete();
                }
            }, 1000);
        }
    }

    pauseTimer() {
        if (this.isRunning) {
            this.isRunning = false;
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    handleTimerComplete() {
        this.pauseTimer();
        const startButton = document.getElementById('start-focus');
        
        if (!this.isBreak) {
            // Focus session completed
            this.totalFocusTime += this.focusTime;
            localStorage.setItem('totalFocusTime', this.totalFocusTime);
            this.updateProgress();
            this.showToast('Great job! Take a short break.');
            this.currentTime = this.breakTime;
            this.isBreak = true;
        } else {
            // Break completed
            this.showToast('Break complete! Ready for another focus session?');
            this.currentTime = this.focusTime;
            this.isBreak = false;
        }

        if (startButton) {
            startButton.textContent = 'Start Focus Session';
            startButton.classList.remove('active');
        }
        
        this.updateTimerDisplay();
        
        // Play notification sound if available
        const audio = document.getElementById('timer-complete');
        if (audio) {
            audio.play().catch(error => console.log('Audio playback prevented:', error));
        }
    }

    updateTimerDisplay() {
        const timerDisplay = document.querySelector('.timer-display');
        if (timerDisplay) {
            const minutes = Math.floor(this.currentTime / 60);
            const seconds = this.currentTime % 60;
            timerDisplay.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updateProgress() {
        const focusProgress = document.querySelector('.progress-item:first-child .progress');
        if (focusProgress) {
            // Calculate progress (4 hours = 100%)
            const maxFocusTime = 4 * 60 * 60; // 4 hours in seconds
            const focusPercentage = Math.min((this.totalFocusTime / maxFocusTime) * 100, 100);
            focusProgress.style.width = `${focusPercentage}%`;
        }
    }

    setupQuotes() {
        const quoteElement = document.getElementById('daily-quote');
        const authorElement = document.getElementById('quote-author');
        
        if (quoteElement && authorElement) {
            const randomQuote = this.quotes[Math.floor(Math.random() * this.quotes.length)];
            quoteElement.textContent = randomQuote.text;
            authorElement.textContent = `- ${randomQuote.author}`;
        }
    }

    setupMindfulnessReminders() {
        // Check for reminders every minute
        setInterval(() => {
            const now = Date.now();
            if (now - this.lastReminderTime >= 3600000 && !this.isRunning) { // 1 hour in milliseconds
                this.showMindfulnessReminder();
                this.lastReminderTime = now;
            }
        }, 60000);
    }

    showMindfulnessReminder() {
        const modal = document.getElementById('mindfulness-modal');
        if (modal) {
            modal.classList.add('show');
            
            const breathText = document.querySelector('.breath-text');
            if (breathText) {
                let isBreathingIn = true;
                const breathingInterval = setInterval(() => {
                    breathText.textContent = isBreathingIn ? 'Breathe Out...' : 'Breathe In...';
                    isBreathingIn = !isBreathingIn;
                }, 4000);

                // Store interval ID to clear it when modal is closed
                modal.dataset.breathingInterval = breathingInterval;
            }
        }
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    }
}

// Theme Management
class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'light';
        this.initializeTheme();
    }

    initializeTheme() {
        this.applyTheme();
        this.setupEventListeners();
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        this.updateThemeIcon();
    }

    setupEventListeners() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        localStorage.setItem('theme', this.theme);
        this.showToast(`Switched to ${this.theme} mode`);
    }

    updateThemeIcon() {
        const icon = document.querySelector('#theme-toggle i');
        if (icon) {
            icon.className = this.theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    }
}

// Initialize everything after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize managers
    window.authManager = new AuthManager();
    window.taskManager = new TaskManager();
    window.mindfulnessManager = new MindfulnessManager();
    window.themeManager = new ThemeManager();

    // Setup navigation
    setupNavigation();

    // Setup mobile features
    setupMobileFeatures();

    // Set initial active section based on URL hash or default to dashboard
    const hash = window.location.hash.slice(1);
    window.taskManager.switchSection(hash || 'dashboard');

    // Handle back button and hash changes
    window.addEventListener('popstate', () => {
        const hash = window.location.hash.slice(1);
        window.taskManager.switchSection(hash || 'dashboard');
    });

    // Handle beforeunload to save state
    window.addEventListener('beforeunload', () => {
        if (window.taskManager && window.authManager) {
            window.authManager.saveUserTasks(window.taskManager.tasks);
        }
    });
});

function setupNavigation() {
    // Setup navigation click handlers
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.closest('a').getAttribute('data-section');
            if (section) {
                window.taskManager.switchSection(section);
                history.pushState(null, '', `#${section}`);
            }
        });
    });

    // Setup mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
                navLinks.classList.remove('active');
            }
        });
    }
}

function setupMobileFeatures() {
    // Setup touch events for mobile
    const container = document.querySelector('.container');
    if (container) {
        let touchStartX = 0;
        let touchEndX = 0;

        container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, false);

        container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, false);

        function handleSwipe() {
            const SWIPE_THRESHOLD = 100;
            const navLinks = document.querySelector('.nav-links');
            
            if (navLinks) {
                if (touchEndX - touchStartX > SWIPE_THRESHOLD) {
                    // Swipe right - show menu
                    navLinks.classList.add('active');
                } else if (touchStartX - touchEndX > SWIPE_THRESHOLD) {
                    // Swipe left - hide menu
                    navLinks.classList.remove('active');
                }
            }
        }
    }

    // Handle orientation changes
    const updateLayout = debounce(() => {
        const isMobile = window.innerWidth <= 768;
        const navLinks = document.querySelector('.nav-links');
        
        if (navLinks && !isMobile) {
            navLinks.classList.remove('active');
        }

        // Update task list layout
        document.querySelectorAll('.task-list').forEach(list => {
            list.style.gridTemplateColumns = isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))';
        });
    }, 250);

    window.addEventListener('orientationchange', updateLayout);
    window.addEventListener('resize', updateLayout);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
} 