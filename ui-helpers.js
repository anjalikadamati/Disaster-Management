// UI Helper functions and additional functionality
class UIHelpers {
  constructor(platform) {
    this.platform = platform;
  }

  // Map functionality
  async initializeMap() {
    try {
      const mapElement = document.getElementById('map-element');
      if (!mapElement) return;

      this.platform.map = L.map('map-element').setView([40.7128, -74.0060], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(this.platform.map);

      this.platform.markersLayer = L.layerGroup().addTo(this.platform.map);

      this.platform.map.on('click', (e) => {
          if (this.platform.selectingLocation) {
            // If marker doesn't exist, create it
            if (!this.platform.selectionMarker) {
              this.platform.selectionMarker = L.marker(e.latlng, { draggable: true }).addTo(this.platform.map);
              this.platform.selectionMarker.on('dragend', (ev) => {
                this.platform.selectedLocation = ev.target.getLatLng();
                this.updateLocationDisplay();
              });
            } else {
              this.platform.selectionMarker.setLatLng(e.latlng);
            }
            this.platform.selectedLocation = e.latlng;
            this.updateLocationDisplay();
          }
        });

      this.updateMapMarkers();
    } catch (error) {
      console.error('Error initializing map:', error);
      this.platform.showToast('Error', 'Failed to initialize map', 'error');
    }
  }

  updateMapMarkers() {
    if (!this.platform.markersLayer) return;

    this.platform.markersLayer.clearLayers();

    this.platform.reports.forEach(report => {
      if (report.location && report.status === 'active') {
        const marker = this.createReportMarker(report);
        this.platform.markersLayer.addLayer(marker);
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

  // Location services
  async getCurrentLocation() {
    if (!navigator.geolocation) {
      this.platform.showToast('Error', 'Geolocation is not supported by this browser', 'error');
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

      this.platform.currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      this.updateLocationDisplay();
      this.platform.showToast('Success', 'Location obtained successfully', 'success');
    } catch (error) {
      console.error('Error getting location:', error);
      this.platform.showToast('Error', 'Unable to get your location', 'error');
    }
  }

  selectLocationOnMap() {
    this.platform.selectingLocation = true;
    document.body.style.cursor = 'crosshair';
    this.platform.showToast('Info', 'Click on the map to select location', 'info');
    this.platform.showSection('map');
  }

  updateLocationDisplay() {
    const locationDisplay = document.getElementById('location-display');
    if (!locationDisplay) return;

    const location = this.platform.selectedLocation || this.platform.currentLocation;
    
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
  }

  goToMyLocation() {
    if (this.platform.currentLocation && this.platform.map) {
      this.platform.map.setView([this.platform.currentLocation.lat, this.platform.currentLocation.lng], 16);
    } else {
      this.getCurrentLocation().then(() => {
        if (this.platform.currentLocation && this.platform.map) {
          this.platform.map.setView([this.platform.currentLocation.lat, this.platform.currentLocation.lng], 16);
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
    
    this.platform.selectedLocation = null;
    this.updateLocationDisplay();
    
    const photoPreview = document.getElementById('photo-preview');
    if (photoPreview) {
      photoPreview.innerHTML = '';
    }
  }

  closeModal(modal) {
    modal?.classList.remove('active');
    this.platform.selectingLocation = false;
    document.body.style.cursor = 'default';
  }

  async handleReportSubmit(e) {
    e.preventDefault();
    
    const location = this.platform.selectedLocation || this.platform.currentLocation;
    
    if (!location) {
      this.platform.showToast('Error', 'Please select a location', 'error');
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

      this.platform.reports.push(report);
      this.platform.saveData();
      this.updateMapMarkers();
      this.platform.updateDashboardStats();
      this.platform.renderReports();
      
      this.closeModal(document.getElementById('report-modal'));
      this.platform.showToast('Success', 'Incident report submitted successfully', 'success');
    } catch (error) {
      console.error('Error submitting report:', error);
      this.platform.showToast('Error', 'Failed to submit report', 'error');
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

      this.platform.volunteers.push(volunteer);
      this.platform.saveData();
      this.platform.updateDashboardStats();
      this.platform.renderVolunteers();
      
      e.target.reset();
      this.platform.showToast('Success', 'Volunteer registration completed', 'success');
    } catch (error) {
      console.error('Error registering volunteer:', error);
      this.platform.showToast('Error', 'Failed to register volunteer', 'error');
    }
  }

  // Filtering
  applyFilters() {
    const categoryFilter = document.getElementById('category-filter')?.value || '';
    const severityFilter = document.getElementById('severity-filter')?.value || '';
    const dateFilter = document.getElementById('date-filter')?.value || '';

    let filteredReports = [...this.platform.reports];

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

    if (this.platform.markersLayer) {
      this.platform.markersLayer.clearLayers();
      filteredReports.forEach(report => {
        if (report.location && report.status === 'active') {
          const marker = this.createReportMarker(report);
          this.platform.markersLayer.addLayer(marker);
        }
      });
    }

    this.platform.renderReports(filteredReports);
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
      reports: this.platform.reports,
      volunteers: this.platform.volunteers,
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
    this.platform.showToast('Success', 'Data exported successfully', 'success');
  }

  async importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.reports && Array.isArray(data.reports)) {
        this.platform.reports = [...this.platform.reports, ...data.reports];
      }

      if (data.volunteers && Array.isArray(data.volunteers)) {
        this.platform.volunteers = [...this.platform.volunteers, ...data.volunteers];
      }

      this.platform.saveData();
      this.updateMapMarkers();
      this.platform.updateDashboardStats();
      this.platform.renderReports();
      this.platform.renderVolunteers();

      this.platform.showToast('Success', 'Data imported successfully', 'success');
    } catch (error) {
      console.error('Error importing data:', error);
      this.platform.showToast('Error', 'Failed to import data', 'error');
    }

    e.target.value = '';
  }

  // Heatmap
  toggleHeatmap() {
    if (!this.platform.map) return;

    if (this.platform.heatmapLayer) {
      this.platform.map.removeLayer(this.platform.heatmapLayer);
      this.platform.heatmapLayer = null;
      this.platform.showToast('Info', 'Heatmap hidden', 'info');
    } else {
      this.createHeatmap();
      this.platform.showToast('Info', 'Heatmap displayed', 'info');
    }
  }

  createHeatmap() {
    if (!this.platform.reports.length) return;

    const heatData = this.platform.reports
      .filter(report => report.location && report.status === 'active')
      .map(report => {
        const intensity = this.getSeverityWeight(report.severity);
        return [report.location.lat, report.location.lng, intensity];
      });

    if (heatData.length === 0) return;

    this.platform.heatmapLayer = L.layerGroup();
    
    heatData.forEach(point => {
      const circle = L.circle([point[0], point[1]], {
        radius: 200 * point[2],
        fillColor: this.getHeatColor(point[2]),
        fillOpacity: 0.3,
        stroke: false
      });
      this.platform.heatmapLayer.addLayer(circle);
    });

    this.platform.heatmapLayer.addTo(this.platform.map);
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
}

// Extend the main platform with UI helpers
DisasterResponsePlatform.prototype.initializeMap = UIHelpers.prototype.initializeMap;
DisasterResponsePlatform.prototype.updateMapMarkers = UIHelpers.prototype.updateMapMarkers;
DisasterResponsePlatform.prototype.createReportMarker = UIHelpers.prototype.createReportMarker;
DisasterResponsePlatform.prototype.getIconConfig = UIHelpers.prototype.getIconConfig;
DisasterResponsePlatform.prototype.createPopupContent = UIHelpers.prototype.createPopupContent;
DisasterResponsePlatform.prototype.getCurrentLocation = UIHelpers.prototype.getCurrentLocation;
DisasterResponsePlatform.prototype.selectLocationOnMap = UIHelpers.prototype.selectLocationOnMap;
DisasterResponsePlatform.prototype.updateLocationDisplay = UIHelpers.prototype.updateLocationDisplay;
DisasterResponsePlatform.prototype.goToMyLocation = UIHelpers.prototype.goToMyLocation;
DisasterResponsePlatform.prototype.openReportModal = UIHelpers.prototype.openReportModal;
DisasterResponsePlatform.prototype.closeModal = UIHelpers.prototype.closeModal;
DisasterResponsePlatform.prototype.handleReportSubmit = UIHelpers.prototype.handleReportSubmit;
DisasterResponsePlatform.prototype.processPhoto = UIHelpers.prototype.processPhoto;
DisasterResponsePlatform.prototype.handlePhotoUpload = UIHelpers.prototype.handlePhotoUpload;
DisasterResponsePlatform.prototype.reverseGeocode = UIHelpers.prototype.reverseGeocode;
DisasterResponsePlatform.prototype.showIncidentDetails = UIHelpers.prototype.showIncidentDetails;
DisasterResponsePlatform.prototype.handleVolunteerSubmit = UIHelpers.prototype.handleVolunteerSubmit;
DisasterResponsePlatform.prototype.applyFilters = UIHelpers.prototype.applyFilters;
DisasterResponsePlatform.prototype.filterByCategory = UIHelpers.prototype.filterByCategory;
DisasterResponsePlatform.prototype.exportData = UIHelpers.prototype.exportData;
DisasterResponsePlatform.prototype.importData = UIHelpers.prototype.importData;
DisasterResponsePlatform.prototype.toggleHeatmap = UIHelpers.prototype.toggleHeatmap;
DisasterResponsePlatform.prototype.createHeatmap = UIHelpers.prototype.createHeatmap;
DisasterResponsePlatform.prototype.getSeverityWeight = UIHelpers.prototype.getSeverityWeight;
DisasterResponsePlatform.prototype.getHeatColor = UIHelpers.prototype.getHeatColor;
DisasterResponsePlatform.prototype.getTimeAgo = UIHelpers.prototype.getTimeAgo;
DisasterResponsePlatform.prototype.showToast = UIHelpers.prototype.showToast;

// Add rendering methods
DisasterResponsePlatform.prototype.updateDashboardStats = function() {
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
};

DisasterResponsePlatform.prototype.renderReports = function(reports = this.reports) {
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
};

DisasterResponsePlatform.prototype.renderVolunteers = function() {
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
};

// Initialize the platform when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.platform = new DisasterResponsePlatform();
    window.platform.init();
});