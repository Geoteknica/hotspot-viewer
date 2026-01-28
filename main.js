import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './style.css';

// Initialize map centered on Puerto Rico
const map = L.map('map').setView([18.2208, -66.5901], 9);

// Add base layer (OpenStreetMap)
const baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
}).addTo(map);

// Alternative base layers
const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri',
    maxZoom: 18
});

const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 18
});

// Current layer reference
let currentImageOverlay = null;
let rasterMetadata = null;

// Configuration for all hotspot analyses
const hotspotConfigs = [
    {
        id: 'CDTs',
        name: 'Centros de Diagnóstico y Tratamiento',
        description: 'Concentración de Centros de Diagnóstico y Tratamiento',
        source: 'Departamento de Salud, 2024'
    },
    {
        id: 'Centros_330',
        name: 'Centros de Salud Primaria de PR',
        description: 'Concentración de Centros de Salud Primaria 330',
        source: 'Asociación de Salud Primaria de Puerto Rico, 2024'
    },
    {
        id: 'Centros_dialisis',
        name: 'Centros de Diálisis',
        description: 'Concentración de centros de diálisis',
        source: 'Departamento de Salud, 2024'
    },
    {
        id: 'Centros_imagenes',
        name: 'Centros de Imágenes',
        description: 'Concentración de centros de imágenes',
        source: 'Google Places, 2023'
    },
    {
        id: 'Centros_terminacion_embarazo',
        name: 'Centros de salud integral',
        description: 'Concentración de centros de salud integral',
        source: 'Departamento de Salud, 2024'
    },
    {
        id: 'Cirugia_ambulatoria',
        name: 'Cirugía Ambulatoria',
        description: 'Concentración de centros de cirugía ambulatoria',
        source: 'Departamento de Salud, 2024'
    },
    {
        id: 'Farmacias',
        name: 'Farmacias',
        description: 'Concentración de farmacias',
        source: 'Google Places, 2023'
    },
    {
        id: 'Hospitales',
        name: 'Hospitales',
        description: 'Concentración de hospitales',
        source: 'Departamento de Salud, 2024'
    },
    {
        id: 'Lab_clinicos',
        name: 'Laboratorios clínicos',
        description: 'Concentración de laboratorios clínicos',
        source: 'Departamento de Salud, 2024'
    },
    {
        id: 'oficinasmedicas',
        name: 'Oficinas médicas',
        description: 'Concentración de oficinas médicas',
        source: 'Google Places, 2023'
    },
    {
        id: 'Salas_urgencia',
        name: 'Salas de urgencia',
        description: 'Concentración de salas de urgencia',
        source: 'Departamento de Salud, 2024'
    }
];

// UI Elements
const loadingDiv = document.getElementById('loading');
const layerSelector = document.getElementById('layer-selector');
const layerInfo = document.getElementById('layer-info');
const baseLayerSelector = document.getElementById('base-layer');
const opacitySlider = document.getElementById('opacity-slider');
const opacityValue = document.getElementById('opacity-value');

// Show/hide loading indicator
function showLoading(show) {
    loadingDiv.style.display = show ? 'block' : 'none';
}

// Load metadata on startup
async function loadMetadata() {
    try {
        const response = await fetch('/data/raster_metadata.json');
        rasterMetadata = await response.json();
        console.log('Metadata loaded:', rasterMetadata);
        return true;
    } catch (error) {
        console.error('Failed to load metadata:', error);
        alert('Error al cargar metadatos de las capas.');
        return false;
    }
}

// Load and display a hotspot layer using ImageOverlay
function loadHotspotLayer(configId) {
    showLoading(true);
    
    // Remove current overlay completely
    if (currentImageOverlay) {
        map.removeLayer(currentImageOverlay);
        currentImageOverlay = null;
    }
    
    // Find config
    const config = hotspotConfigs.find(c => c.id === configId);
    if (!config) {
        console.error('Config not found:', configId);
        showLoading(false);
        return;
    }
    
    // Get metadata for this layer
    const metadata = rasterMetadata[configId];
    if (!metadata) {
        console.error('Metadata not found for:', configId);
        alert(`No se encontraron metadatos para ${config.name}`);
        showLoading(false);
        return;
    }
    
    console.log('Loading:', metadata.file);
    console.log('Bounds:', metadata.bounds);
    
    // Create image overlay with specific bounds
    const imageUrl = `/data/${metadata.file}`;
    
    currentImageOverlay = L.imageOverlay(imageUrl, metadata.bounds, {
        opacity: opacitySlider.value / 100,
        interactive: false,
        crossOrigin: true
    });
    
    // Handle load event
    currentImageOverlay.on('load', function() {
        console.log('Image loaded successfully');
        updateLayerInfo(config);
        document.getElementById('toggleLayer').textContent = 'Ocultar Capa';
        showLoading(false);
    });
    
    // Handle error event
    currentImageOverlay.on('error', function() {
        console.error('Failed to load image:', imageUrl);
        alert(`Error al cargar ${config.name}. Verifique que el archivo existe.`);
        showLoading(false);
    });
    
    // Add to map
    currentImageOverlay.addTo(map);
    
    // Fit bounds with padding
    map.fitBounds(metadata.bounds, { padding: [50, 50] });
}

// Update layer information display
function updateLayerInfo(config) {
    layerInfo.innerHTML = `
        <strong>${config.name}</strong><br>
        <small>${config.description}</small><br>
        <small style="font-size: 11px; color: #888; margin-top: 4px; display: block;">Fuente: ${config.source}</small>
    `;
}

// Initialize layer selector
function initializeLayerSelector() {
    layerSelector.innerHTML = '<option value="">Seleccione un análisis...</option>';
    
    hotspotConfigs.forEach(config => {
        const option = document.createElement('option');
        option.value = config.id;
        option.textContent = config.name;
        layerSelector.appendChild(option);
    });
    
    layerSelector.addEventListener('change', (e) => {
        if (e.target.value) {
            loadHotspotLayer(e.target.value);
        } else {
            if (currentImageOverlay) {
                map.removeLayer(currentImageOverlay);
                currentImageOverlay = null;
            }
            layerInfo.innerHTML = '<small>Seleccione un análisis para ver</small>';
            document.getElementById('toggleLayer').textContent = 'Ocultar Capa';
        }
    });
}

// Handle base layer changes
baseLayerSelector.addEventListener('change', (e) => {
    map.removeLayer(baseLayer);
    map.removeLayer(satelliteLayer);
    map.removeLayer(darkLayer);
    
    switch(e.target.value) {
        case 'satellite':
            satelliteLayer.addTo(map);
            break;
        case 'dark':
            darkLayer.addTo(map);
            break;
        default:
            baseLayer.addTo(map);
    }
});

// Toggle layer visibility
document.getElementById('toggleLayer').addEventListener('click', () => {
    if (currentImageOverlay) {
        if (map.hasLayer(currentImageOverlay)) {
            map.removeLayer(currentImageOverlay);
            document.getElementById('toggleLayer').textContent = 'Mostrar Capa';
        } else {
            currentImageOverlay.addTo(map);
            document.getElementById('toggleLayer').textContent = 'Ocultar Capa';
        }
    }
});

// Opacity slider
opacitySlider.addEventListener('input', (e) => {
    const opacity = e.target.value / 100;
    opacityValue.textContent = e.target.value + '%';
    
    if (currentImageOverlay) {
        currentImageOverlay.setOpacity(opacity);
    }
});

// Add legend
const legend = L.control({ position: 'bottomright' });

legend.onAdd = function() {
    const div = L.DomUtil.create('div', 'legend');
    div.innerHTML = '<h4>Concentración</h4>';
    
    const grades = [0, 0.2, 0.4, 0.8, 0.9];
    const labels = ['Muy Baja', 'Baja', 'Media', 'Alta', 'Muy Alta'];
    const colors = ['#fcbba1', '#fc4e2a', '#ef3b2c', '#cb181d', '#a50f15'];
    
    for (let i = 0; i < grades.length; i++) {
        div.innerHTML +=
            '<i style="background:' + colors[i] + '"></i> ' +
            labels[i] + '<br>';
    }
    
    //div.innerHTML += '<div style="font-size: 9px; color: #888; margin-top: 8px; padding-top: 6px; border-top: 1px solid #ddd;">Análisis espacial</div>';
    
    return div;
};

legend.addTo(map);

// Welcome Modal functionality
const welcomeModal = document.getElementById('welcome-modal');
const closeModalBtn = document.getElementById('close-modal');
const dontShowAgain = document.getElementById('dont-show-again');
const showInfoBtn = document.getElementById('show-info');

// Check if user has chosen not to show modal
const hideWelcome = localStorage.getItem('hideWelcomeModal');

if (!hideWelcome) {
    welcomeModal.classList.remove('hidden');
}

// Close modal
closeModalBtn.addEventListener('click', () => {
    if (dontShowAgain.checked) {
        localStorage.setItem('hideWelcomeModal', 'true');
    }
    welcomeModal.classList.add('hidden');
});

// Show info button - reopens modal
showInfoBtn.addEventListener('click', () => {
    welcomeModal.classList.remove('hidden');
});

// Close modal when clicking outside
welcomeModal.addEventListener('click', (e) => {
    if (e.target === welcomeModal) {
        welcomeModal.classList.add('hidden');
    }
});

// Initialize app
async function initApp() {
    showLoading(true);
    
    // Load metadata first
    const metadataLoaded = await loadMetadata();
    
    if (metadataLoaded) {
        // Initialize UI
        initializeLayerSelector();
        
        // Auto-load first layer
        if (hotspotConfigs.length > 0) {
            layerSelector.value = hotspotConfigs[0].id;
            loadHotspotLayer(hotspotConfigs[0].id);
        } else {
            showLoading(false);
        }
    } else {
        showLoading(false);
    }
}

// Start the app
initApp();