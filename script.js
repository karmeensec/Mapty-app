'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const resetBtn = document.querySelector('.reset__btn');

class Workout {

    date = new Date();
    id = (Date.now() + '').slice(-10);
    clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords; // [lat, lng]
        this.distance = distance;
        this.duration = duration;
    }

    _setDescription() {

        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }

    click() {
        this.clicks++;
    }

}

class Running extends Workout {
    type = 'running';

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;

        this.calcPace();
        this._setDescription();
    }

    calcPace() { //min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }

};

class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, distance, duration, elevation) {
        super(coords, distance, duration);
        this.elevation = elevation;

        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() { //km/h
        this.speed = this.distance / (this.duration / 60); //hours
        return this.speed;
    }

};


const run = new Running([51, 19], 4.5, 30, 120);
const cycle = new Cycling([51, 22], 5.5, 35, 130);


class App {

    #map;
    #mapEvent;
    #workouts = [];
    #mapZoomLevel = 12;

    constructor() {

        //Get user's position
        this._getPosition();

        // Get data from localStorage

        this._getLocalStorage();

        // Event handlers
        form.addEventListener('submit', this._newWorkouts.bind(this));

        inputType.addEventListener('change', this._toggleElevations.bind(this));

        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

        resetBtn.addEventListener('click', this.resetApp.bind(this));

    }

    _getPosition() {

        if (navigator.geolocation) {

            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this) ,function(){
            
                alert('I could not get current position');
            
            });
        
         }
    }

    _loadMap(position) {
        
            const {latitude} = position.coords;
            const {longitude} = position.coords;
    
            const googleMaps = `https://www.google.com/maps/@${latitude},${longitude}`;
            console.log(googleMaps);
    
            const coords = [latitude, longitude];
            
            this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    
            L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.#map);

            // Clicks on the map
            this.#map.on('click', this._showForm.bind(this));

            this.#workouts.forEach((work)=> {
                this._renderWorkoutMarker(work);
            })
    }

    _showForm(mapE) {

        this.#mapEvent = mapE;
    
        form.classList.remove('hidden');
        inputDistance.focus();

    }

    _hideForm() {

        // Clear inputs
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = ''; 

        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(()=> form.style.display = 'grid', 1000);

    }

    _toggleElevations() {

        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');

    }

    _newWorkouts(e) {

        const validInputHelp = (...inputs) =>
            inputs.every(inp => Number.isFinite(inp));

        const allPositiveHelp = (...inputs) => inputs.every(inp => inp > 0);

        e.preventDefault();

        // Get data from the form

        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {lat, lng} = this.#mapEvent.latlng;
        let workout;

        // Running, then create a new running object

        if (type === 'running') {
            const cadence = +inputCadence.value;

            // Check validity of the input

            // if (!Number.isFinite(distance) || !Number.isFinite(duration) || !Number.isFinite(cadence))

            if (!validInputHelp(distance, duration, cadence) || !allPositiveHelp(distance, duration, cadence))
                return alert('Input is not a Positive Number!');  // Guard Clause

                workout = new Running([lat, lng], distance, duration, cadence);
                
        }


        // Cycling, then create a new cycling object

        if (type === 'cycling') {
            const elevation = +inputElevation.value;

            // Check validity of the input

            if (!validInputHelp(distance, duration, elevation) || !allPositiveHelp(distance, duration))
                return alert('Input is not a Positive Number!');  // Guard Clause

                workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        // Add new object to the array

        this.#workouts.push(workout);

        // Render workout on map as marker

        this._renderWorkoutMarker(workout);

        // Render workout list

        this._renderWorkout(workout);

        // Hide form and Clear inputs

        this._hideForm(); 

        // Set the Local Storage

        this._setLocalStorage();

    }

    _renderWorkoutMarker(workout) {

        L.marker(workout.coords).addTo(this.#map)
            .bindPopup(L.popup({maxWidth: 200, minWidth: 100, autoClose: false, closeOnClick: false, className: `${workout.type}-popup`}))
            .setPopupContent(` ${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout) {

        let html = `

        <li class="workout workout--${workout.type}" data-id="${workout.id}">

            <h2 class="workout__title">${workout.description}</h2>

            <div class="workout__details">
                <span class="workout__icon"> ${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} </span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>

            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>

        `

        if (workout.type === 'running') {

            html += `

            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
            </div>

            <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
            </div>

        </li>

            `

        }

        if (workout.type === 'cycling') {

            html += `
            
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
            </div>

          <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevation}</span>
                <span class="workout__unit">m</span>
          </div>

        </li> 

            `

        }

        form.insertAdjacentHTML('afterend', html);
        
    }

    _moveToPopup(e) {

        const workoutElement = e.target.closest('.workout');

        if (!workoutElement) return;

        const workout = this.#workouts.find((work)=> work.id === workoutElement.dataset.id);

        this.#map.setView(workout.coords, this.#mapZoomLevel, {animate: true, pan: {duration: 1}});

    }

    _setLocalStorage() {

        localStorage.setItem('workouts', JSON.stringify(this.#workouts))

    }

    _getLocalStorage() {

        const data = JSON.parse(localStorage.getItem('workouts'));

        if (!data) return;

        this.#workouts = data;

        this.#workouts.forEach((work)=> {
            this._renderWorkout(work);
        })
    }


    resetApp() {

        localStorage.removeItem('workouts');
        location.reload();

    }


}

const app = new App();







