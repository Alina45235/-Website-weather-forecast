const API_KEY = '79a070fe108c4af585a948bdee4b93b1';
let currentCityName = 'Москва';
let forecastData = null;

const tabs = document.querySelectorAll('.tab');
const views = document.querySelectorAll('.view');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        views.forEach(v => v.classList.add('hidden'));
        const target = tab.getAttribute('data-tab') === 'today' ? 'todayView' : 'forecastView';
        document.getElementById(target).classList.remove('hidden');
        if(target === 'forecastView' && forecastData) {
            renderFiveDays(forecastData);
        }
    });
});

const search = () => {
    const val = searchInput.value.trim();
    if (val) {
        getWeatherData(`q=${val}`);
    }
};

searchBtn.addEventListener('click', search);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') search();
});

// Переведенные направления ветра
const getDirection = (degree) => {
    const directions = ['С', 'ССВ', 'СВ', 'ВСВ', 'В', 'ВЮВ', 'ЮВ', 'ЮЮВ', 'Ю', 'ЮЮЗ', 'ЮЗ', 'ЗЮЗ', 'З', 'ЗСЗ', 'СЗ', 'ССЗ'];
    return directions[Math.round(degree / 22.5) % 16];
};

const formatTime = (unix) => {
    const d = new Date(unix * 1000);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (unix) => {
    const d = new Date(unix * 1000);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getDayName = (unix) => {
    return new Date(unix * 1000).toLocaleDateString('ru-RU', { weekday: 'short' }).toUpperCase();
};

const getWeatherData = async (query) => {
    try {
        // Добавлен параметр &lang=ru для русского языка от API
        const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?${query}&appid=${API_KEY}&units=metric&lang=ru`);
        if (!weatherRes.ok) throw new Error('Город не найден');
        const weather = await weatherRes.json();

        currentCityName = weather.name;
        // Оставляем страну как приходит от API 
        searchInput.value = `${weather.name}, ${weather.sys.country}`;

        const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${weather.coord.lat}&lon=${weather.coord.lon}&appid=${API_KEY}&units=metric&lang=ru`);
        forecastData = await forecastRes.json();

        const findRes = await fetch(`https://api.openweathermap.org/data/2.5/find?lat=${weather.coord.lat}&lon=${weather.coord.lon}&cnt=5&appid=${API_KEY}&units=metric&lang=ru`);
        const findData = await findRes.json();

        renderToday(weather, forecastData, findData.list.filter(item => item.id !== weather.id).slice(0, 4));
        if (document.querySelector('.tab[data-tab="forecast"]').classList.contains('active')) {
            renderFiveDays(forecastData);
        }
        
        document.getElementById('errorView').classList.add('hidden');
        if (document.querySelector('.tab[data-tab="today"]').classList.contains('active')) {
             document.getElementById('todayView').classList.remove('hidden');
        } else {
             document.getElementById('forecastView').classList.remove('hidden');
        }

    } catch (error) {
        views.forEach(v => v.classList.add('hidden'));
        document.getElementById('errorView').classList.remove('hidden');
        document.getElementById('errorText').innerHTML = `Город "${searchInput.value}" не найден.<br>Пожалуйста, попробуйте другой запрос.`;
    }
};

const renderToday = (weather, forecast, nearby) => {
    document.getElementById('currentDate').textContent = formatDate(weather.dt);
    document.getElementById('currentIcon').src = `https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`;
    document.getElementById('currentDesc').textContent = weather.weather[0].description;
    document.getElementById('currentTemp').innerHTML = `${Math.round(weather.main.temp)}&deg;C`;
    document.getElementById('currentFeel').innerHTML = `${Math.round(weather.main.feels_like)}&deg;C`;
    
    document.getElementById('currentSunrise').textContent = formatTime(weather.sys.sunrise);
    document.getElementById('currentSunset').textContent = formatTime(weather.sys.sunset);
    
    const duration = (weather.sys.sunset - weather.sys.sunrise) / 3600;
    const durHours = Math.floor(duration);
    const durMins = Math.round((duration - durHours) * 60);
    document.getElementById('currentDuration').textContent = `${durHours} ч ${String(durMins).padStart(2, '0')} мин`;

    const todayItems = forecast.list.slice(0, 6);
    renderHourlyTable('todayHourlyTable', todayItems, 'СЕГОДНЯ');

    const nearbyGrid = document.getElementById('nearbyGrid');
    nearbyGrid.innerHTML = '';
    nearby.forEach(city => {
        nearbyGrid.innerHTML += `
            <div class="nearby-item">
                <span>${city.name}</span>
                <img src="https://openweathermap.org/img/wn/${city.weather[0].icon}.png" alt="icon">
                <span>${Math.round(city.main.temp)}&deg;C</span>
            </div>
        `;
    });
};

const renderHourlyTable = (tableId, items, rowTitle) => {
    const tbody = document.querySelector(`#${tableId} tbody`);
    let html = `<tr><th>${rowTitle}</th>`;
    items.forEach(item => html += `<td>${formatTime(item.dt)}</td>`);
    html += `</tr><tr><th></th>`;
    items.forEach(item => html += `<td><img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png"></td>`);
    html += `</tr><tr><th>Прогноз</th>`;
    items.forEach(item => html += `<td><span style="text-transform: capitalize;">${item.weather[0].description}</span></td>`);
    html += `</tr><tr><th>Темп. (&deg;C)</th>`;
    items.forEach(item => html += `<td>${Math.round(item.main.temp)}&deg;</td>`);
    html += `</tr><tr><th>Ощущается</th>`;
    items.forEach(item => html += `<td>${Math.round(item.main.feels_like)}&deg;</td>`);
    html += `</tr><tr><th>Ветер (км/ч)</th>`;
    items.forEach(item => html += `<td>${Math.round(item.wind.speed * 3.6)} ${getDirection(item.wind.deg)}</td>`);
    html += `</tr>`;
    tbody.innerHTML = html;
};

const renderFiveDays = (forecast) => {
    const dailyData = [];
    const addedDays = new Set();
    
    forecast.list.forEach(item => {
        const dateStr = new Date(item.dt * 1000).toDateString();
        // Берем прогноз примерно на середину дня 
        if (!addedDays.has(dateStr) && dailyData.length < 5) {
            addedDays.add(dateStr);
            dailyData.push(item);
        }
    });

    const grid = document.getElementById('fiveDaysGrid');
    grid.innerHTML = '';
    
    dailyData.forEach((day, index) => {
        const dateObj = new Date(day.dt * 1000);
        const card = document.createElement('div');
        card.className = `day-card ${index === 0 ? 'active' : ''}`;
        card.innerHTML = `
            <h4>${getDayName(day.dt)}</h4>
            <p>${dateObj.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }).toUpperCase()}</p>
            <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png">
            <div class="temp">${Math.round(day.main.temp)}&deg;C</div>
            <p style="text-transform: capitalize;">${day.weather[0].description}</p>
        `;
        
        card.addEventListener('click', () => {
            document.querySelectorAll('.day-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const dayStartStr = dateObj.toISOString().split('T')[0];
            const hourlyItems = forecast.list.filter(item => {
                const itemDateStr = new Date(item.dt * 1000).toISOString().split('T')[0];
                return itemDateStr === dayStartStr;
            }).slice(0, 6);
            renderHourlyTable('forecastHourlyTable', hourlyItems, getDayName(day.dt));
        });
        
        grid.appendChild(card);
    });

    const firstDayStartStr = new Date(dailyData[0].dt * 1000).toISOString().split('T')[0];
    const initialHourly = forecast.list.filter(item => {
        const itemDateStr = new Date(item.dt * 1000).toISOString().split('T')[0];
        return itemDateStr === firstDayStartStr;
    }).slice(0, 6);
    renderHourlyTable('forecastHourlyTable', initialHourly, getDayName(dailyData[0].dt));
};

const init = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                getWeatherData(`lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
            },
            () => {
                
                getWeatherData(`q=${currentCityName}`);
            }
        );
    } else {
        getWeatherData(`q=${currentCityName}`);
    }
};

init();