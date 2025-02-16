// Initialize Socket.io
const socket = io();

// Initialize Google Maps
function initMap() {
    const map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -34.397, lng: 150.644 },
        zoom: 12,
        styles: [
            {
                featureType: "all",
                elementType: "geometry",
                stylers: [{ color: "#f5f5f5" }]
            },
            {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ color: "#e9e9e9" }]
            },
            {
                featureType: "water",
                elementType: "labels.text.fill",
                stylers: [{ color: "#9e9e9e" }]
            }
        ]
    });

    // Get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            map.setCenter(pos);
            loadNearbyCenters(pos);
        });
    }
}

// Animate number counters
function animateCounter(element, target) {
    let current = 0;
    const increment = target / 100;
    const duration = 2000;
    const interval = duration / 100;

    const timer = setInterval(() => {
        current += increment;
        element.textContent = Math.round(current);

        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        }
    }, interval);
}

// Initialize counters
document.addEventListener('DOMContentLoaded', () => {
    const counters = document.querySelectorAll('.counter');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.dataset.target);
                animateCounter(entry.target, target);
                observer.unobserve(entry.target);
            }
        });
    });

    counters.forEach(counter => observer.observe(counter));
});

// Initialize waste tracking chart
const ctx = document.getElementById('wasteChart').getContext('2d');
const wasteChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
            label: 'Recyclables',
            data: [12, 19, 15, 25, 22, 30],
            borderColor: '#2ecc71',
            tension: 0.4
        }, {
            label: 'Non-recyclables',
            data: [8, 15, 12, 10, 7, 5],
            borderColor: '#e74c3c',
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            }
        }
    }
});

// Initialize community progress chart
const progressCtx = document.getElementById('communityProgress').getContext('2d');
const progressChart = new Chart(progressCtx, {
    type: 'doughnut',
    data: {
        labels: ['Progress', 'Remaining'],
        datasets: [{
            data: [75, 25],
            backgroundColor: ['#2ecc71', '#ecf0f1']
        }]
    },
    options: {
        cutout: '80%',
        plugins: {
            legend: {
                display: false
            }
        }
    }
});

// Load nearby recycling centers
async function loadNearbyCenters(position) {
    try {
        const response = await fetch('/api/centers');
        const centers = await response.json();
        
        const centersList = document.getElementById('centersList');
        centersList.innerHTML = centers.map(center => `
            <div class="center-item" data-aos="fade-up">
                <h3>${center.name}</h3>
                <p>${center.address}</p>
                <p>Accepts: ${center.materials.join(', ')}</p>
                <div class="center-actions">
                    <button onclick="getDirections(${center.lat}, ${center.lng})">
                        <i class='bx bx-directions'></i> Get Directions
                    </button>
                    <button onclick="showCenterDetails(${center.id})">
                        <i class='bx bx-info-circle'></i> More Info
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading centers:', error);
        showNotification('Error loading recycling centers', 'error');
    }
}

// Handle waste tracking
const trackButtons = document.querySelectorAll('.track-button');
const modal = document.getElementById('wasteModal');
const closeBtn = document.querySelector('.close');
const quantityInput = document.getElementById('quantity');
const quantitySlider = document.querySelector('.quantity-slider input');

// Sync quantity input and slider
quantityInput.addEventListener('input', (e) => {
    quantitySlider.value = e.target.value;
    updateImpactPreview(e.target.value);
});

quantitySlider.addEventListener('input', (e) => {
    quantityInput.value = e.target.value;
    updateImpactPreview(e.target.value);
});

function updateImpactPreview(quantity) {
    const treesSaved = (quantity * 0.5).toFixed(1);
    const waterSaved = (quantity * 100).toFixed(0);
    
    document.querySelector('.impact-stats').innerHTML = `
        <div class="impact-stat">
            <i class='bx bx-tree'></i>
            <span>${treesSaved} trees saved</span>
        </div>
        <div class="impact-stat">
            <i class='bx bx-water'></i>
            <span>${waterSaved}L water saved</span>
        </div>
    `;
}

trackButtons.forEach(button => {
    button.addEventListener('click', () => {
        modal.style.display = 'block';
        modal.classList.add('active');
    });
});

closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
});

// Handle waste form submission
document.getElementById('wasteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        type: document.getElementById('wasteType').value,
        quantity: document.getElementById('quantity').value
    };
    
    try {
        const response = await fetch('/api/waste/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showNotification('Waste logged successfully!');
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
            e.target.reset();
            
            // Check for achievements
            checkAchievements();
        }
    } catch (error) {
        console.error('Error logging waste:', error);
        showNotification('Error logging waste. Please try again.', 'error');
    }
});

// Load leaderboard
async function loadLeaderboard(period = 'weekly') {
    try {
        const response = await fetch('/api/leaderboard');
        const users = await response.json();
        
        const leaderboardList = document.getElementById('leaderboardList');
        leaderboardList.innerHTML = users.map((user, index) => `
            <li class="leaderboard-item" data-aos="fade-left" data-aos-delay="${index * 100}">
                <span class="rank">#${index + 1}</span>
                <span class="name">${user.name}</span>
                <span class="points">${user.points} pts</span>
            </li>
        `).join('');
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

// Handle leaderboard tabs
const tabButtons = document.querySelectorAll('.tab-btn');
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        loadLeaderboard(button.dataset.period);
    });
});

// Show notifications
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.querySelector('p').textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Handle achievements
function checkAchievements() {
    // Mock achievement check
    const achievements = [
        { title: 'First Recycling Log', description: 'You logged your first recycling activity!' },
        { title: 'Eco Warrior', description: 'You\'ve recycled over 10kg of waste!' }
    ];
    
    const achievementModal = document.getElementById('achievementModal');
    const randomAchievement = achievements[Math.floor(Math.random() * achievements.length)];
    
    achievementModal.querySelector('.achievement-description').textContent = randomAchievement.description;
    achievementModal.style.display = 'block';
    achievementModal.classList.add('active');
}

// Handle eco tips carousel
let currentTip = 0;
const tips = [
    { title: 'Reduce Plastic', content: 'Use reusable bags and containers to minimize plastic waste.' },
    { title: 'Save Water', content: 'Fix leaky faucets and take shorter showers to conserve water.' },
    { title: 'Compost', content: 'Start composting food scraps to reduce organic waste.' }
];

function showTip(index) {
    const carousel = document.querySelector('.tip-carousel');
    carousel.innerHTML = `
        <div class="tip-card active">
            <i class='bx bx-bulb'></i>
            <h3>${tips[index].title}</h3>
            <p>${tips[index].content}</p>
        </div>
    `;
}

document.querySelector('.next-tip').addEventListener('click', () => {
    currentTip = (currentTip + 1) % tips.length;
    showTip(currentTip);
});

document.querySelector('.prev-tip').addEventListener('click', () => {
    currentTip = (currentTip - 1 + tips.length) % tips.length;
    showTip(currentTip);
});

// Initialize features on page load
document.addEventListener('DOMContentLoaded', () => {
    loadLeaderboard();
    showTip(0);
    
    // Handle navbar scroll effect
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
});

// Real-time updates with Socket.io
socket.on('wasteUpdate', (data) => {
    // Update waste chart
    wasteChart.data.datasets[0].data = data.recyclables;
    wasteChart.data.datasets[1].data = data.nonRecyclables;
    wasteChart.update();
});

socket.on('leaderboardUpdate', (data) => {
    loadLeaderboard();
});