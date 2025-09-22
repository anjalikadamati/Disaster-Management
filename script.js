// Main Disaster Response Platform JavaScript
class DisasterResponsePlatform {
  constructor() {
    this.reports = [];
    this.volunteers = [];
    this.map = null;
    this.markersLayer = null;
    this.heatmapLayer = null;
    this.currentSection = 'dashboard';
    this.currentLocation = null;
    this.selectedLocation = null;
    this.selectingLocation = false;
  }

  async init() {
    try {
      await this.loadData();
      this.initializeEventListeners();
      this.initializeNavigation();
      await this.initializeMap();
      this.updateDashboardStats();
      this.renderReports();
      this.renderVolunteers();
      this.hideLoadingScreen();
    } catch (error) {
      console.error('Error initializing platform:', error);
      this.showToast('Error', 'Failed to initialize platform', 'error');
      this.hideLoadingScreen();
    }
  }

  // Data persistence
  async loadData() {
    try {
      const savedReports = localStorage.getItem('disaster-reports');
      const savedVolunteers = localStorage.getItem('disaster-volunteers');
      
      this.reports = savedReports ? JSON.parse(savedReports) : [];
      this.volunteers = savedVolunteers ? JSON.parse(savedVolunteers) : [];
      
      if (this.reports.length === 0) {
        this.addSampleData();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      this.reports = [];
      this.volunteers = [];
    }
  }

  saveData() {
    try {
      localStorage.setItem('disaster-reports', JSON.stringify(this.reports));
      localStorage.setItem('disaster-volunteers', JSON.stringify(this.volunteers));
    } catch (error) {
      console.error('Error saving data:', error);
      this.showToast('Error', 'Failed to save data', 'error');
    }
  }

  addSampleData() {
    const sampleReports = [
      {
        id: 'report-1',
        title: 'Medical Emergency - Heart Attack',
        category: 'medical',
        severity: 'critical',
        description: 'Elderly person experiencing chest pains and difficulty breathing. Requires immediate medical attention.',
        location: { lat: 40.7128, lng: -74.0060 },
        address: 'Central Park, New York, NY',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        status: 'active'
      },
      {
        id: 'report-2',
        title: 'Emergency Shelter Needed',
        category: 'shelter',
        severity: 'high',
        description: 'Family of 4 displaced by apartment fire. Need temporary housing and basic supplies.',
        location: { lat: 40.7589, lng: -73.9851 },
        address: 'Times Square, New York, NY',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        status: 'active'
      },
      {
        id: 'report-3',
        title: 'Food Distribution Point',
        category: 'food',
        severity: 'medium',
        description: 'Community kitchen running low on supplies. Need food donations and volunteers.',
        location: { lat: 40.6782, lng: -73.9442 },
        address: 'Brooklyn Bridge, NY',
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        status: 'active'
      }
    ];

    const sampleVolunteers = [
      {
        id: 'volunteer-1',
        name: 'Dr. Kumari',
        phone: '+91 9948739954',
        skills: ['medical', 'communication'],
        available: true,
        registeredAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'volunteer-2',
        name: 'Dr. Prasad',
        phone: '+91 6800295798',
        skills: ['search-rescue', 'logistics'],
        available: true,
        registeredAt: new Date(Date.now() - 172800000).toISOString()
      }
    ];

    this.reports = sampleReports;
    this.volunteers = sampleVolunteers;
    this.saveData();
  }

  // Event listeners
  initializeEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        this.showSection(section);
      });
    });

    // Mobile navigation
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    navToggle?.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle?.addEventListener('click', () => this.toggleTheme());

    // Hero buttons
    const heroReportBtn = document.getElementById('hero-report-btn');
    const heroVolunteerBtn = document.getElementById('hero-volunteer-btn');
    
    heroReportBtn?.addEventListener('click', () => this.openReportModal());
    heroVolunteerBtn?.addEventListener('click', () => this.showSection('volunteers'));

    // Report modal
    const reportBtn = document.getElementById('report-incident-btn');
    const reportModal = document.getElementById('report-modal');
    const modalClose = document.getElementById('modal-close');
    const cancelReport = document.getElementById('cancel-report');

    reportBtn?.addEventListener('click', () => this.openReportModal());
    modalClose?.addEventListener('click', () => this.closeModal(reportModal));
    cancelReport?.addEventListener('click', () => this.closeModal(reportModal));

    // Report form
    const reportForm = document.getElementById('report-form');
    reportForm?.addEventListener('submit', (e) => this.handleReportSubmit(e));

    // Location buttons
    const useLocationBtn = document.getElementById('use-location');
    const selectOnMapBtn = document.getElementById('select-on-map');
    
    useLocationBtn?.addEventListener('click', () => this.getCurrentLocation());
    selectOnMapBtn?.addEventListener('click', () => this.selectLocationOnMap());

    // Photo upload
    const photoInput = document.getElementById('report-photo');
    photoInput?.addEventListener('change', (e) => this.handlePhotoUpload(e));

    // Volunteer form
    const volunteerForm = document.getElementById('volunteer-form');
    volunteerForm?.addEventListener('submit', (e) => this.handleVolunteerSubmit(e));

    // Map controls
    const heatmapToggle = document.getElementById('heatmap-toggle');
    const myLocationBtn = document.getElementById('my-location');
    
    heatmapToggle?.addEventListener('click', () => this.toggleHeatmap());
    myLocationBtn?.addEventListener('click', () => this.goToMyLocation());

    // Filters
    const categoryFilter = document.getElementById('category-filter');
    const severityFilter = document.getElementById('severity-filter');
    const dateFilter = document.getElementById('date-filter');

    categoryFilter?.addEventListener('change', () => this.applyFilters());
    severityFilter?.addEventListener('change', () => this.applyFilters());
    dateFilter?.addEventListener('change', () => this.applyFilters());

    // Data export/import
    const exportBtn = document.getElementById('export-data');
    const importBtn = document.getElementById('import-data');
    const fileInput = document.getElementById('file-input');

    exportBtn?.addEventListener('click', () => this.exportData());
    importBtn?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => this.importData(e));

    // Incident modal
    const incidentModalClose = document.getElementById('incident-modal-close');
    incidentModalClose?.addEventListener('click', () => {
      this.closeModal(document.getElementById('incident-modal'));
    });

    // Close modals on outside click
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.closeModal(e.target);
      }
    });

    // Disaster type cards
    document.querySelectorAll('.disaster-card').forEach(card => {
      card.addEventListener('click', () => {
        const type = card.dataset.type;
        this.showSection('map');
        this.filterByCategory(type);
      });
    });
  }

  // Navigation
  initializeNavigation() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);
  }

  showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.remove('active');
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });

    const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }

    this.currentSection = sectionId;
    document.getElementById('nav-menu')?.classList.remove('active');

    if (sectionId === 'map' && this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 300);
    }
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    this.updateThemeIcon(newTheme);
  }

  updateThemeIcon(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    const icon = themeToggle?.querySelector('i');
    
    if (icon) {
      if (theme === 'dark') {
        icon.className = 'fas fa-sun';
      } else {
        icon.className = 'fas fa-moon';
      }
    }
  }

  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
          loadingScreen.remove();
        }, 500);
      }, 1000);
    }
  }

  // Map functionality
  async initializeMap() {
    try {
      const mapElement = document.getElementById('map-element');
      if (!mapElement) return;

      this.map = L.map('map-element').setView([40.7128, -74.0060], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(this.map);

      this.markersLayer = L.layerGroup().addTo(this.map);

      this.map.on('click', (e) => {
        if (this.selectingLocation) {
          this.selectedLocation = e.latlng;
          this.updateLocationDisplay();
          this.selectingLocation = false;
          document.body.style.cursor = 'default';
          
          const reportModal = document.getElementById('report-modal');
          if (reportModal) {
            reportModal.classList.add('active'); // Show the report modal again
          }
          this.showToast('Success', 'Location selected on map', 'success');
        }
      });

      this.updateMapMarkers();
    } catch (error) {
      console.error('Error initializing map:', error);
      this.showToast('Error', 'Failed to initialize map', 'error');
    }
  }

  updateMapMarkers() {
    if (!this.markersLayer) return;

    this.markersLayer.clearLayers();

    this.reports.forEach(report => {
      if (report.location && report.status === 'active') {
        const marker = this.createReportMarker(report);
        this.markersLayer.addLayer(marker);
      }
    });
  }

  createReportMarker(report) {
    const iconConfig = this.getIconConfig(report.category, report.severity);
    
    const customIcon = L.divIcon({
      html: `<i class="fas ${iconConfig.icon}" style="color: ${iconConfig.color}; font-size: 20px;"></i>`,
      iconSize: [30, 30],
      className: 'custom-marker',
      iconAnchor: [15, 15]
    });

    const marker = L.marker([report.location.lat, report.location.lng], {
      icon: customIcon
    });

    const popupContent = this.createPopupContent(report);
    marker.bindPopup(popupContent);

    marker.on('click', () => {
      this.showIncidentDetails(report);
    });

    return marker;
  }

  getIconConfig(category, severity) {
    const configs = {
      medical: { icon: 'fa-heartbeat', color: '#dc2626' },
      shelter: { icon: 'fa-home', color: '#2563eb' },
      food: { icon: 'fa-utensils', color: '#059669' },
      sos: { icon: 'fa-exclamation-triangle', color: '#d97706' }
    };

    return configs[category] || { icon: 'fa-circle', color: '#6b7280' };
  }

  createPopupContent(report) {
    const timeAgo = this.getTimeAgo(report.timestamp);
    
    return `
      <div class="map-popup">
        <h4>${report.title}</h4>
        <div class="popup-meta">
          <span class="popup-category ${report.category}">
            <i class="fas ${this.getIconConfig(report.category).icon}"></i>
            ${report.category.charAt(0).toUpperCase() + report.category.slice(1)}
          </span>
          <span class="popup-severity severity-${report.severity}">
            ${report.severity.charAt(0).toUpperCase() + report.severity.slice(1)}
          </span>
        </div>
        <p>${report.description.substring(0, 100)}${report.description.length > 100 ? '...' : ''}</p>
        <div class="popup-time">
          <i class="fas fa-clock"></i>
          ${timeAgo}
        </div>
      </div>
    `;
  }

  // Utility functions
  getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInMs = now - past;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 30) return `${diffInDays} days ago`;
    
    return past.toLocaleDateString();
  }

  showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-times-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };

    toast.innerHTML = `
      <div class="toast-icon">
        <i class="fas ${icons[type]}"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">
        <i class="fas fa-times"></i>
      </button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });

    toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 5000);
  }

  // --- NEW DELETE METHODS ---
  deleteReport(reportId) {
    if (confirm('Are you sure you want to delete this report?')) {
        this.reports = this.reports.filter(report => report.id !== reportId);
        this.saveData();
        this.renderReports();
        this.updateDashboardStats();
        this.updateMapMarkers();
        this.showToast('Success', 'Report deleted successfully', 'success');
    }
  }

  deleteVolunteer(volunteerId) {
    if (confirm('Are you sure you want to unregister this volunteer?')) {
        this.volunteers = this.volunteers.filter(volunteer => volunteer.id !== volunteerId);
        this.saveData();
        this.renderVolunteers();
        this.updateDashboardStats();
        this.showToast('Success', 'Volunteer unregistered successfully', 'success');
    }
  }

  // Rendering methods
  updateDashboardStats() {
    const totalReports = document.getElementById('total-reports');
    const availableVolunteers = document.getElementById('available-volunteers');
    const volunteerCount = document.getElementById('volunteer-count');

    if (totalReports) {
      totalReports.textContent = this.reports.filter(r => r.status === 'active').length;
    }

    const available = this.volunteers.filter(v => v.available).length;
    
    if (availableVolunteers) {
      availableVolunteers.textContent = available;
    }
    
    if (volunteerCount) {
      volunteerCount.textContent = available;
    }
  }

  renderReports(reports = this.reports) {
    const reportsGrid = document.getElementById('reports-grid');
    if (!reportsGrid) return;

    if (reports.length === 0) {
      reportsGrid.innerHTML = `
        <div class="no-reports">
          <i class="fas fa-clipboard-list"></i>
          <h4>No Reports Found</h4>
          <p>No reports match the current filters</p>
        </div>
      `;
      return;
    }

    reportsGrid.innerHTML = reports.map(report => {
      const timeAgo = this.getTimeAgo(report.timestamp);
      const iconConfig = this.getIconConfig(report.category);
      
      return `
        <div class="report-card severity-${report.severity}">
          <div class="report-header">
            <div class="report-title">${report.title}</div>
            <div class="report-actions">
              <div class="report-category ${report.category}">
                <i class="fas ${iconConfig.icon}"></i>
                ${report.category.charAt(0).toUpperCase() + report.category.slice(1)}
              </div>
              <button class="delete-btn" onclick="platform.deleteReport('${report.id}')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          
          <div class="report-meta" onclick="platform.showIncidentDetails(${JSON.stringify(report).replace(/"/g, '&quot;')})">
            <div class="report-time">
              <i class="fas fa-clock"></i>
              ${timeAgo}
            </div>
            <div class="severity-badge severity-${report.severity}">
              ${report.severity.charAt(0).toUpperCase() + report.severity.slice(1)}
            </div>
          </div>
          
          <div class="report-description" onclick="platform.showIncidentDetails(${JSON.stringify(report).replace(/"/g, '&quot;')})">
            ${report.description}
          </div>
          
          <div class="report-location" onclick="platform.showIncidentDetails(${JSON.stringify(report).replace(/"/g, '&quot;')})">
            <i class="fas fa-map-marker-alt"></i>
            ${report.address || 'Location not available'}
          </div>
        </div>
      `;
    }).join('');
  }

  renderVolunteers() {
    const volunteersGrid = document.getElementById('volunteers-grid');
    if (!volunteersGrid) return;

    if (this.volunteers.length === 0) {
      volunteersGrid.innerHTML = `
        <div class="no-volunteers">
          <i class="fas fa-users"></i>
          <h4>No Volunteers Registered</h4>
          <p>Be the first to register as a volunteer</p>
        </div>
      `;
      return;
    }

    volunteersGrid.innerHTML = this.volunteers.map(volunteer => {
      const registeredAgo = this.getTimeAgo(volunteer.registeredAt);
      
      return `
        <div class="volunteer-card ${volunteer.available ? 'available' : 'unavailable'}">
          <div class="volunteer-info">
            <div class="volunteer-actions">
              <h5>${volunteer.name}</h5>
              <button class="delete-btn" onclick="platform.deleteVolunteer('${volunteer.id}')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
            
            <div class="volunteer-phone">
              <i class="fas fa-phone"></i>
              ${volunteer.phone}
            </div>
            
            <div class="volunteer-skills">
              ${volunteer.skills.map(skill => 
                `<span class="skill-tag">${skill.charAt(0).toUpperCase() + skill.slice(1)}</span>`
              ).join('')}
            </div>
            
            <div class="volunteer-status">
              <div class="status-indicator ${volunteer.available ? 'available' : 'unavailable'}"></div>
              ${volunteer.available ? 'Available' : 'Unavailable'}
            </div>
          </div>
          
          <div class="volunteer-registered">
            Registered ${registeredAgo}
          </div>
        </div>
      `;
    }).join('');
  }

  // Location services
  async getCurrentLocation() {
    if (!navigator.geolocation) {
      this.showToast('Error', 'Geolocation is not supported by this browser', 'error');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    };

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });

      this.currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      this.updateLocationDisplay();
      this.showToast('Success', 'Location obtained successfully', 'success');
    } catch (error) {
      console.error('Error getting location:', error);
      this.showToast('Error', 'Unable to get your location', 'error');
    }
  }

  selectLocationOnMap() {
    const reportModal = document.getElementById('report-modal');
    if (reportModal) {
      reportModal.classList.remove('active'); // Hide the report modal
    }

    this.selectingLocation = true;
    document.body.style.cursor = 'crosshair';
    this.showToast('Info', 'Click on the map to select location', 'info');
    this.showSection('map'); // Switch to map section
  }

  updateLocationDisplay() {
    const locationDisplay = document.getElementById('location-display');
    if (!locationDisplay) return;

    const location = this.selectedLocation || this.currentLocation;
    
    if (location) {
      locationDisplay.innerHTML = `
        <div class="selected-location">
          <i class="fas fa-map-marker-alt"></i>
          <span>Location: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</span>
        </div>
      `;
    } else {
      locationDisplay.innerHTML = '';
    }

    // If a location is selected on the map, add a temporary marker
    if (this.selectedLocation && this.map) {
      if (this.tempMarker) {
        this.map.removeLayer(this.tempMarker);
      }
      this.tempMarker = L.marker([this.selectedLocation.lat, this.selectedLocation.lng]).addTo(this.map)
        .bindPopup('Selected Location').openPopup();
    } else if (this.tempMarker) {
      this.map.removeLayer(this.tempMarker);
      this.tempMarker = null;
    }
  }

  goToMyLocation() {
    if (this.currentLocation && this.map) {
      this.map.setView([this.currentLocation.lat, this.currentLocation.lng], 16);
    } else {
      this.getCurrentLocation().then(() => {
        if (this.currentLocation && this.map) {
          this.map.setView([this.currentLocation.lat, this.currentLocation.lng], 16);
        }
      });
    }
  }

  // Report management
  openReportModal() {
    const modal = document.getElementById('report-modal');
    modal?.classList.add('active');
    
    const form = document.getElementById('report-form');
    form?.reset();
    
    this.selectedLocation = null;
    this.updateLocationDisplay();
    
    const photoPreview = document.getElementById('photo-preview');
    if (photoPreview) {
      photoPreview.innerHTML = '';
    }
  }

  closeModal(modal) {
    modal?.classList.remove('active');
    this.selectingLocation = false;
    document.body.style.cursor = 'default';
  }

  async handleReportSubmit(e) {
    e.preventDefault();
    
    const location = this.selectedLocation || this.currentLocation;
    
    if (!location) {
      this.showToast('Error', 'Please select a location', 'error');
      return;
    }

    try {
      const report = {
        id: 'report-' + Date.now(),
        title: document.getElementById('report-title')?.value,
        category: document.getElementById('report-category')?.value,
        severity: document.getElementById('report-severity')?.value,
        description: document.getElementById('report-description')?.value,
        location: location,
        address: await this.reverseGeocode(location),
        timestamp: new Date().toISOString(),
        status: 'active'
      };

      const photoFile = document.getElementById('report-photo')?.files[0];
      if (photoFile) {
        report.photo = await this.processPhoto(photoFile);
      }

      this.reports.push(report);
      this.saveData();
      this.updateMapMarkers();
      this.updateDashboardStats();
      this.renderReports();
      
      this.closeModal(document.getElementById('report-modal'));
      this.showToast('Success', 'Incident report submitted successfully', 'success');
    } catch (error) {
      console.error('Error submitting report:', error);
      this.showToast('Error', 'Failed to submit report', 'error');
    }
  }

  async processPhoto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const photoPreview = document.getElementById('photo-preview');
      if (photoPreview) {
        photoPreview.innerHTML = `
          <img src="${event.target.result}" alt="Photo preview" style="max-width: 200px; max-height: 200px; object-fit: cover; border-radius: 8px;">
        `;
      }
    };
    reader.readAsDataURL(file);
  }

  async reverseGeocode(location) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`
      );
      const data = await response.json();
      return data.display_name || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    }
  }

  showIncidentDetails(report) {
    const modal = document.getElementById('incident-modal');
    const detailsContainer = document.getElementById('incident-details');
    
    if (!modal || !detailsContainer) return;

    const timeAgo = this.getTimeAgo(report.timestamp);

    detailsContainer.innerHTML = `
      ${report.photo ? `<img src="${report.photo}" alt="Incident photo" class="incident-image">` : ''}
      
      <div class="incident-meta">
        <div class="incident-meta-item">
          <div class="incident-meta-label">Category</div>
          <div class="incident-meta-value">
            <i class="fas ${this.getIconConfig(report.category).icon}"></i>
            ${report.category.charAt(0).toUpperCase() + report.category.slice(1)}
          </div>
        </div>
        <div class="incident-meta-item">
          <div class="incident-meta-label">Severity</div>
          <div class="incident-meta-value">
            <span class="severity-badge severity-${report.severity}">
              ${report.severity.charAt(0).toUpperCase() + report.severity.slice(1)}
            </span>
          </div>
        </div>
        <div class="incident-meta-item">
          <div class="incident-meta-label">Reported</div>
          <div class="incident-meta-value">${timeAgo}</div>
        </div>
        <div class="incident-meta-item">
          <div class="incident-meta-label">Status</div>
          <div class="incident-meta-value">
            <span class="status-badge status-${report.status}">
              ${report.status.charAt(0).toUpperCase() + report.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      <div class="incident-description">
        <h4>Description</h4>
        <p>${report.description}</p>
      </div>

      <div class="incident-location">
        <i class="fas fa-map-marker-alt"></i>
        <span>${report.address}</span>
      </div>
    `;

    document.getElementById('incident-title').textContent = report.title;
    modal.classList.add('active');
  }

  // Volunteer management
  async handleVolunteerSubmit(e) {
    e.preventDefault();

    try {
      const skills = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
        .filter(cb => cb.id.startsWith('skill-'))
        .map(cb => cb.value);

      const volunteer = {
        id: 'volunteer-' + Date.now(),
        name: document.getElementById('volunteer-name')?.value,
        phone: document.getElementById('volunteer-phone')?.value,
        skills: skills,
        available: document.getElementById('volunteer-available')?.checked || false,
        registeredAt: new Date().toISOString()
      };

      this.volunteers.push(volunteer);
      this.saveData();
      this.updateDashboardStats();
      this.renderVolunteers();
      
      e.target.reset();
      this.showToast('Success', 'Volunteer registration completed', 'success');
    } catch (error) {
      console.error('Error registering volunteer:', error);
      this.showToast('Error', 'Failed to register volunteer', 'error');
    }
  }

  // Filtering
  applyFilters() {
    const categoryFilter = document.getElementById('category-filter')?.value || '';
    const severityFilter = document.getElementById('severity-filter')?.value || '';
    const dateFilter = document.getElementById('date-filter')?.value || '';

    let filteredReports = [...this.reports];

    if (categoryFilter) {
      filteredReports = filteredReports.filter(report => report.category === categoryFilter);
    }

    if (severityFilter) {
      filteredReports = filteredReports.filter(report => report.severity === severityFilter);
    }

    if (dateFilter) {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        default:
          filterDate.setTime(0);
      }

      filteredReports = filteredReports.filter(report => 
        new Date(report.timestamp) >= filterDate
      );
    }

    if (this.markersLayer) {
      this.markersLayer.clearLayers();
      filteredReports.forEach(report => {
        if (report.location && report.status === 'active') {
          const marker = this.createReportMarker(report);
          this.markersLayer.addLayer(marker);
        }
      });
    }

    this.renderReports(filteredReports);
  }

  filterByCategory(category) {
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
      categoryFilter.value = category;
      this.applyFilters();
    }
  }

  // Data export/import
  exportData() {
    const data = {
      reports: this.reports,
      volunteers: this.volunteers,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `rescue-hub-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    this.showToast('Success', 'Data exported successfully', 'success');
  }

  async importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.reports && Array.isArray(data.reports)) {
        this.reports = [...this.reports, ...data.reports];
      }

      if (data.volunteers && Array.isArray(data.volunteers)) {
        this.volunteers = [...this.volunteers, ...data.volunteers];
      }

      this.saveData();
      this.updateMapMarkers();
      this.updateDashboardStats();
      this.renderReports();
      this.renderVolunteers();

      this.showToast('Success', 'Data imported successfully', 'success');
    } catch (error) {
      console.error('Error importing data:', error);
      this.showToast('Error', 'Failed to import data', 'error');
    }

    e.target.value = '';
  }

  // Heatmap
  toggleHeatmap() {
    if (!this.map) return;

    if (this.heatmapLayer) {
      this.map.removeLayer(this.heatmapLayer);
      this.heatmapLayer = null;
      this.showToast('Info', 'Heatmap hidden', 'info');
    } else {
      this.createHeatmap();
      this.showToast('Info', 'Heatmap displayed', 'info');
    }
  }

  createHeatmap() {
    if (!this.reports.length) return;

    const heatData = this.reports
      .filter(report => report.location && report.status === 'active')
      .map(report => {
        const intensity = this.getSeverityWeight(report.severity);
        return [report.location.lat, report.location.lng, intensity];
      });

    if (heatData.length === 0) return;

    this.heatmapLayer = L.layerGroup();
    
    heatData.forEach(point => {
      const circle = L.circle([point[0], point[1]], {
        radius: 200 * point[2],
        fillColor: this.getHeatColor(point[2]),
        fillOpacity: 0.3,
        stroke: false
      });
      this.heatmapLayer.addLayer(circle);
    });

    this.heatmapLayer.addTo(this.map);
  }

  getSeverityWeight(severity) {
    const weights = {
      critical: 1.0,
      high: 0.8,
      medium: 0.6,
      low: 0.4
    };
    return weights[severity] || 0.5;
  }

  getHeatColor(intensity) {
    if (intensity >= 0.8) return '#dc2626';
    if (intensity >= 0.6) return '#d97706';
    if (intensity >= 0.4) return '#059669';
    return '#3b82f6';
  }
}

// Service Worker registration
if (('serviceWorker' in navigator) && (location.protocol === 'https:' || location.protocol === 'http:')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Initialize the platform when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.platform = new DisasterResponsePlatform();
  window.platform.init();
});