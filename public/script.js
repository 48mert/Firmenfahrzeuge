// Hier wird der JavaScript-Teil für die Webseite geschrieben, der Daten über die API holt und speichert

// Hier werden die Fahrzeuge gespeichert, die vom Server geladen werden, damit Tabelle, Suche und Historie direkt mit diesen Daten arbeiten können
let vehicles = [];


// Hier werden die wichtigsten Elemente aus der HTML-Datei direkt am Anfang geholt, damit sie später nicht in jeder Funktion neu gesucht werden müssen
const tableBody = document.getElementById('vehicleTableBody');
const form = document.getElementById('vehicleForm');
const formTitle = document.getElementById('formTitle');
const cancelEditButton = document.getElementById('cancelEditButton');
const searchInput = document.getElementById('searchInput');
const fuelFilter = document.getElementById('fuelFilter');
const rankingType = document.getElementById('rankingType');
const rankingDirection = document.getElementById('rankingDirection');
const rankingFuelFilter = document.getElementById('rankingFuelFilter');
const rankingList = document.getElementById('rankingList');
const analysis = document.getElementById('analysis');
const historyForm = document.getElementById('historyForm');
const historyVehicleSelect = document.getElementById('historyVehicleSelect');
const historySelectionText = document.getElementById('historySelectionText');
const historyList = document.getElementById('historyList');


// Hier stehen die Fahrzeug-IDs, die aktuell für die Historie ausgewählt sind
let selectedHistoryVehicleIds = [];


// Hier werden alle Fahrzeuge neu vom Backend geladen
// Danach werden Tabelle, Filter, Ranking und Historie wieder neu angezeigt
async function loadVehicles() {
    const response = await fetch('/api/vehicles');
    vehicles = await response.json();

    fillFuelFilter();
    fillHistoryVehicleList();
    showVehicles();
    showRanking();
    showSelectedHistory();
}

// Hier werden Grenzen für die Jahresfelder im Formular gesetzt
// Beim Baujahr soll kein Zukunftsjahr möglich sein, beim Pickerl aber ein paar Jahre voraus
function setYearLimits() {
    const currentYear = new Date().getFullYear();
    document.getElementById('year').max = currentYear;
    document.getElementById('nextInspectionYear').min = 2000;
    document.getElementById('nextInspectionYear').max = currentYear + 10;
}

// Hier werden die Kennzahlen aus dem Backend geholt
// Aus den Daten werden oben die kleinen Dashboard-Karten gebaut
async function loadAnalysis() {
    const response = await fetch('/api/analysis');
    const data = await response.json();

    analysis.innerHTML = `
        <div class="analysis-card">
            <strong>Anzahl Fahrzeuge</strong>
            <span>${data.vehicleCount}</span>
            <small>gesamt erfasst</small>
        </div>
        <div class="analysis-card">
            <strong>Durchschnittsverbrauch</strong>
            <span>${data.averageConsumption}</span>
            <small>alle Fahrzeuge mit Verbrauchswert</small>
        </div>
        <div class="analysis-card">
            <strong>Geringster Verbrauch</strong>
            <span>${formatConsumptionValue(data.lowestConsumptionVehicle)}</span>
            <small>${formatVehicleName(data.lowestConsumptionVehicle)}</small>
        </div>
        <div class="analysis-card">
            <strong>Höchste Laufleistung</strong>
            <span>${formatMileageValue(data.highestMileageVehicle)}</span>
            <small>${formatVehicleName(data.highestMileageVehicle)}</small>
        </div>
        <div class="analysis-card">
            <strong>Service bald fällig</strong>
            ${formatVehicleList(data.vehiclesWithServiceSoon, 'service')}
        </div>
        <div class="analysis-card">
            <strong>Pickerl bald fällig</strong>
            ${formatVehicleList(data.vehiclesWithInspectionSoon, 'inspection')}
        </div>
    `;
}

// Hier werden die Auswahlmöglichkeiten für Kraftstofffilter und Rankingfilter gebaut
// Dadurch tauchen nur Kraftstoffarten auf, die es bei den Fahrzeugen wirklich gibt
function fillFuelFilter() {
    const selectedValue = fuelFilter.value;
    const selectedRankingValue = rankingFuelFilter.value || 'fuel';
    const fuelTypes = [...new Set(vehicles.map(vehicle => vehicle.fuelType).filter(Boolean))];

    fuelFilter.innerHTML = '<option value="">Alle Kraftstoffarten</option>';
    rankingFuelFilter.innerHTML = `
        <option value="fuel">Benzin/Diesel/Hybrid</option>
        <option value="Elektro">Elektro</option>
        <option value="">Alle Kraftstoffarten</option>
    `;

    fuelTypes.forEach(fuelType => {
        const option = document.createElement('option');
        option.value = fuelType;
        option.textContent = fuelType;
        fuelFilter.appendChild(option);

        if (fuelType !== 'Elektro') {
            const rankingOption = document.createElement('option');
            rankingOption.value = fuelType;
            rankingOption.textContent = fuelType;
            rankingFuelFilter.appendChild(rankingOption);
        }
    });

    fuelFilter.value = selectedValue;
    rankingFuelFilter.value = selectedRankingValue;
}

// Hier wird die Fahrzeugtabelle auf der Seite neu aufgebaut
// Vorher werden noch Suche und Kraftstofffilter berücksichtigt
function showVehicles() {
    const searchText = searchInput.value.toLowerCase();
    const selectedFuelType = fuelFilter.value;

    // Für die Suche werden mehrere Felder zu einem Text zusammengefasst
    // So findet man ein Auto auch über Marke, Modell, Kennzeichen, Person oder Notizen
    const filteredVehicles = vehicles.filter(vehicle => {
        const text = [
            vehicle.brand,
            vehicle.model,
            vehicle.licensePlate,
            vehicle.assignedUser,
            vehicle.notes
        ].join(' ').toLowerCase();

        const matchesSearch = text.includes(searchText);
        const matchesFuelType = !selectedFuelType || vehicle.fuelType === selectedFuelType;

        return matchesSearch && matchesFuelType;
    });

    // Zuerst wird die Tabelle geleert, sonst würden alte Zeilen doppelt angezeigt werden
    tableBody.innerHTML = '';

    if (filteredVehicles.length === 0) {
        tableBody.innerHTML = '<tr><td class="empty-row" colspan="13">Keine Fahrzeuge gefunden</td></tr>';
        return;
    }

    // Für jedes passende Fahrzeug wird eine neue Zeile in die Tabelle eingefügt
    // Die Buttons in der Zeile starten Bearbeiten, Historie oder Löschen
    filteredVehicles.forEach(vehicle => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${vehicle.brand}</td>
            <td>${vehicle.model}</td>
            <td>${vehicle.licensePlate}</td>
            <td>${vehicle.year || ''}</td>
            <td>${vehicle.mileage || 0}</td>
            <td>${vehicle.fuelType || ''}</td>
            <td>${vehicle.consumption || 0}</td>
            <td>${vehicle.power || ''}</td>
            <td>${vehicle.assignedUser || '-'}</td>
            <td>${vehicle.isPoolVehicle ? 'Ja' : 'Nein'}</td>
            <td>${formatDate(vehicle.nextServiceDate)}</td>
            <td class="${getInspectionClass(vehicle)}">${formatMonth(vehicle.nextInspectionDate)}</td>
            <td>
                <button class="edit-button" type="button" onclick="editVehicle(${vehicle.id})">Bearbeiten</button>
                <button type="button" onclick="selectVehicleForHistory(${vehicle.id})">Historie</button>
                <button class="delete-button" type="button" onclick="deleteVehicle(${vehicle.id})">Löschen</button>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

// Hier wird das Ranking passend zur aktuellen Auswahl erstellt
// Es kann ausgewählt werden, wonach sortiert wird und ob auf- oder absteigend
function showRanking() {
    const type = rankingType.value;
    const direction = rankingDirection.value;
    const selectedFuelType = rankingFuelFilter.value;

    // Beim Verbrauch werden Elektroautos von den anderen Autos getrennt,
    // weil kWh/100 km und Liter/100 km sonst unfair verglichen wären
    const rankedVehicles = vehicles.filter(vehicle => {
        if (selectedFuelType === 'fuel' && vehicle.fuelType === 'Elektro') {
            return false;
        }

        if (selectedFuelType && selectedFuelType !== 'fuel' && vehicle.fuelType !== selectedFuelType) {
            return false;
        }

        return getRankingValue(vehicle, type) > 0;
    // Danach wird je nach Auswahl aufsteigend oder absteigend sortiert
    }).sort((a, b) => {
        const firstValue = getRankingValue(a, type);
        const secondValue = getRankingValue(b, type);

        return direction === 'asc'
            ? firstValue - secondValue
            : secondValue - firstValue;
    });

    rankingList.innerHTML = '';

    if (rankedVehicles.length === 0) {
        rankingList.innerHTML = '<li>Keine Daten für diese Auswahl</li>';
        return;
    }

    rankedVehicles.forEach(vehicle => {
        const item = document.createElement('li');
        item.innerHTML = `
            <strong>${formatVehicleName(vehicle)}</strong>
            <span>${formatRankingValue(vehicle, type)}</span>
        `;
        rankingList.appendChild(item);
    });
}

// Hier werden die Werte aus dem Formular ausgelesen
// Daraus entsteht das Objekt, das an das Backend geschickt wird
function getFormData() {
    return {
        brand: document.getElementById('brand').value,
        model: document.getElementById('model').value,
        licensePlate: document.getElementById('licensePlate').value,
        year: Number(document.getElementById('year').value),
        mileage: Number(document.getElementById('mileage').value),
        fuelType: document.getElementById('fuelType').value,
        consumption: Number(document.getElementById('consumption').value),
        power: Number(document.getElementById('power').value),
        assignedUser: document.getElementById('assignedUser').value,
        isPoolVehicle: document.getElementById('isPoolVehicle').checked,
        nextServiceDate: document.getElementById('nextServiceDate').value,
        nextInspectionDate: getInspectionFormValue(),
        notes: document.getElementById('notes').value,
        history: getCurrentHistory()
    };
}

// Hier werden die Daten eines vorhandenen Fahrzeugs zurück ins Formular geschrieben
// Das wird benötigt, wenn ein Fahrzeug bearbeitet werden soll
function setFormData(vehicle) {
    document.getElementById('vehicleId').value = vehicle.id || '';
    document.getElementById('brand').value = vehicle.brand || '';
    document.getElementById('model').value = vehicle.model || '';
    document.getElementById('licensePlate').value = vehicle.licensePlate || '';
    document.getElementById('year').value = vehicle.year || '';
    document.getElementById('mileage').value = vehicle.mileage || '';
    document.getElementById('fuelType').value = vehicle.fuelType || 'Benzin';
    document.getElementById('consumption').value = vehicle.consumption || '';
    document.getElementById('power').value = vehicle.power || '';
    document.getElementById('assignedUser').value = vehicle.assignedUser || '';
    document.getElementById('isPoolVehicle').checked = vehicle.isPoolVehicle === true;
    document.getElementById('nextServiceDate').value = vehicle.nextServiceDate || '';
    setInspectionFormValue(vehicle.nextInspectionDate);
    document.getElementById('notes').value = vehicle.notes || '';
}

// Hier wird ein Fahrzeug gespeichert
// Ohne ID wird ein neues Fahrzeug angelegt
// Mit ID wird ein bestehendes Fahrzeug geändert
async function saveVehicle(event) {
    // Hier wird das normale Abschicken des Formulars mit Seitenneuladen verhindert
    event.preventDefault();

    if (!isYearValid()) {
        alert('Das Baujahr darf nicht in der Zukunft liegen.');
        return;
    }

    const id = document.getElementById('vehicleId').value;
    // An der ID wird erkannt, ob POST oder PUT verwendet werden muss
    const method = id ? 'PUT' : 'POST';
    const url = id ? '/api/vehicles/' + id : '/api/vehicles';

    await fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(getFormData())
    });

    resetForm();
    await loadVehicles();
    await loadAnalysis();
}

// Hier wird das Bearbeiten eines Fahrzeugs gestartet
// Dafür wird das Fahrzeug in der bereits geladenen Fahrzeugliste gesucht
function editVehicle(id) {
    const vehicle = vehicles.find(item => item.id === id);

    if (!vehicle) {
        return;
    }

    setFormData(vehicle);
    formTitle.textContent = 'Fahrzeug bearbeiten';
    window.scrollTo({ top: form.offsetTop - 20, behavior: 'smooth' });
}

// Hier wird das Mehrfachauswahl-Feld im Historie-Bereich gefüllt
// Schon ausgewählte Fahrzeuge sollen nach dem Neuladen ausgewählt bleiben
function fillHistoryVehicleList() {
    historyVehicleSelect.innerHTML = '';
    selectedHistoryVehicleIds = selectedHistoryVehicleIds.filter(id => {
        return vehicles.some(vehicle => vehicle.id === id);
    });

    vehicles.forEach(vehicle => {
        const option = document.createElement('option');
        option.value = vehicle.id;
        option.textContent = formatVehicleName(vehicle);
        option.selected = selectedHistoryVehicleIds.includes(vehicle.id);
        historyVehicleSelect.appendChild(option);
    });
}

// Hier wird ausgelesen, welche Fahrzeuge im Dropdown ausgewählt wurden
// Danach wird die Historie passend dazu neu angezeigt
function updateSelectedHistoryVehicles() {
    selectedHistoryVehicleIds = Array.from(historyVehicleSelect.selectedOptions).map(option => {
        return Number(option.value);
    });

    showSelectedHistory();
}

// Diese Funktion wird verwendet, wenn in der Tabelle auf „Historie“ geklickt wird
// Das Fahrzeug wird ausgewählt und der Historie-Bereich wird angezeigt
function selectVehicleForHistory(id) {
    const vehicle = vehicles.find(item => item.id === id);

    if (!vehicle) {
        return;
    }

    if (!selectedHistoryVehicleIds.includes(id)) {
        selectedHistoryVehicleIds.push(id);
    }

    fillHistoryVehicleList();
    showSelectedHistory();
    document.querySelector('.history-area').scrollIntoView({ behavior: 'smooth' });
}

// Hier wird die Historie für alle ausgewählten Fahrzeuge angezeigt
// Jedes Fahrzeug bekommt einen eigenen Block, damit nichts durcheinanderkommt
function showSelectedHistory() {
    const selectedVehicles = vehicles.filter(vehicle => selectedHistoryVehicleIds.includes(vehicle.id));
    historyList.innerHTML = '';

    if (selectedVehicles.length === 0) {
        historySelectionText.textContent = 'Mindestens ein Fahrzeug auswählen.';
        historyList.innerHTML = '<p>Keine Fahrzeuge ausgewählt.</p>';
        return;
    }

    historySelectionText.textContent = selectedVehicles.length + ' Fahrzeug(e) ausgewählt.';

    selectedVehicles.forEach(vehicle => {
        // Neue Historieneinträge sollen oben stehen, deshalb wird die Liste umgedreht
        const history = parseHistory(vehicle).slice().reverse();
        const group = document.createElement('div');
        group.className = 'history-group';
        group.innerHTML = '<h3>' + escapeHtml(formatVehicleName(vehicle)) + '</h3>';

        if (history.length === 0) {
            group.innerHTML += '<p>Keine Einträge vorhanden.</p>';
        }

        history.forEach(entry => {
            group.innerHTML += `
                <div class="history-item">
                    <strong>${escapeHtml(entry.type || 'Eintrag')} am ${formatDate(entry.date)}</strong>
                    <p>${escapeHtml(entry.text || '')}</p>
                </div>
            `;
        });

        historyList.appendChild(group);
    });
}

// Hier wird ein Historieneintrag für ein oder mehrere ausgewählte Fahrzeuge gespeichert
// Das ist z.B. praktisch, wenn bei mehreren Autos am selben Tag Reifen gewechselt wurden
async function saveHistory(event) {
    event.preventDefault();

    if (selectedHistoryVehicleIds.length === 0) {
        alert('Bitte mindestens ein Fahrzeug auswählen.');
        return;
    }

    const entry = {
        type: document.getElementById('historyType').value,
        date: document.getElementById('historyDate').value,
        text: document.getElementById('historyText').value
    };

    // Damit wird gewartet, bis der Eintrag bei allen ausgewählten Fahrzeugen gespeichert wurde
    await Promise.all(selectedHistoryVehicleIds.map(id => {
        return fetch('/api/vehicles/' + id + '/history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(entry)
        });
    }));

    historyForm.reset();
    await loadVehicles();
    await loadAnalysis();
    showSelectedHistory();
}

// Hier wird ein Fahrzeug gelöscht, aber erst nach einer Rückfrage
// Danach werden Tabelle und Analyse wieder neu geladen
async function deleteVehicle(id) {
    if (!confirm('Fahrzeug wirklich löschen?')) {
        return;
    }

    await fetch('/api/vehicles/' + id, {
        method: 'DELETE'
    });

    await loadVehicles();
    await loadAnalysis();
}

// Hier wird das Formular wieder auf „Fahrzeug hinzufügen“ zurückgesetzt
function resetForm() {
    form.reset();
    document.getElementById('vehicleId').value = '';
    setInspectionFormValue('');
    formTitle.textContent = 'Fahrzeug hinzufügen';
}

// Beim Bearbeiten darf die vorhandene Historie nicht überschrieben werden
// Deshalb wird sie aus den aktuellen Fahrzeugdaten übernommen
function getCurrentHistory() {
    const id = Number(document.getElementById('vehicleId').value);
    const vehicle = vehicles.find(item => item.id === id);

    return vehicle ? vehicle.history : '[]';
}

// Hier wird die gespeicherte Historie wieder in eine normale JavaScript-Liste umgewandelt
// Falls dabei etwas schiefgeht, wird eine leere Liste verwendet
function parseHistory(vehicle) {
    try {
        return JSON.parse(vehicle.history || '[]');
    } catch (error) {
        return [];
    }
}

// Hier wird aus einem gespeicherten Datum ein lesbares Datum für die Anzeige gemacht
// Wenn kein gültiges Datum vorhanden ist, wird nur ein Strich angezeigt
function formatDate(value) {
    if (!value) {
        return '-';
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleDateString('de-AT');
}

// Hier wird das Pickerl-Datum für die Anzeige formatiert
// Gespeichert wird YYYY-MM, angezeigt wird aber MM/YYYY
function formatMonth(value) {
    if (!value) {
        return '-';
    }

    const parts = formatMonthInput(value).split('-');

    if (parts.length !== 2) {
        return '-';
    }

    return parts[1] + '/' + parts[0];
}

// Hier werden Pickerlwerte in ein einheitliches Format gebracht
// Damit funktionieren sowohl neue Werte wie 2027-01 als auch ältere Eingaben wie 01/2027
function formatMonthInput(value) {
    if (!value) {
        return '';
    }

    if (/^\d{4}-\d{2}/.test(value)) {
        return value.substring(0, 7);
    }

    if (/^\d{2}\/\d{4}$/.test(value)) {
        const parts = value.split('/');
        return parts[1] + '-' + parts[0];
    }

    return '';
}

// Hier wird ein Fahrzeugname gebaut, der überall gut lesbar angezeigt werden kann
function formatVehicleName(vehicle) {
    if (!vehicle) {
        return 'Keine Daten';
    }

    return vehicle.brand + ' ' + vehicle.model + ' (' + vehicle.licensePlate + ')';
}

// Hier wird der Verbrauch mit der richtigen Einheit zurückgegeben
// Elektroautos bekommen kWh/100 km, die anderen l/100 km
function formatConsumptionValue(vehicle) {
    if (!vehicle) {
        return '-';
    }

    return Number(vehicle.consumption || 0) + formatConsumptionUnit(vehicle);
}

// Hier werden Kilometerwerte für die Anzeige formatiert
function formatMileageValue(vehicle) {
    if (!vehicle) {
        return '-';
    }

    return Number(vehicle.mileage || 0).toLocaleString('de-AT') + ' km';
}

// Hier werden die Listen für bald fällige Services oder Pickerl gebaut
// Überfällige Pickerl bekommen eine extra Klasse, damit sie rot angezeigt werden können
function formatVehicleList(items, dateType) {
    if (!items || items.length === 0) {
        return '<p>Keine fälligen Termine</p>';
    }

    const entries = items.map(vehicle => {
        const date = dateType === 'inspection'
            ? formatMonth(vehicle.nextInspectionDate)
            : formatDate(vehicle.nextServiceDate);

        const className = dateType === 'inspection' && isInspectionOverdue(vehicle)
            ? ' class="date-overdue"'
            : '';

        return '<li' + className + '>' + formatVehicleName(vehicle) + ': ' + date + '</li>';
    }).join('');

    return '<ul>' + entries + '</ul>';
}

// Hier werden Pickerl-Monat und Pickerl-Jahr aus dem Formular zusammengesetzt
// Beispiel: Aus Monat 01 und Jahr 2027 wird 2027-01
function getInspectionFormValue() {
    const month = document.getElementById('nextInspectionMonth').value;
    const year = document.getElementById('nextInspectionYear').value;

    if (!month || !year) {
        return '';
    }

    return year + '-' + month;
}

// Hier wird ein gespeicherter Pickerlwert wieder in Jahr und Monat aufgeteilt
// So kann das Formular beim Bearbeiten richtig vorausgefüllt werden
function setInspectionFormValue(value) {
    const monthValue = formatMonthInput(value);
    const parts = monthValue ? monthValue.split('-') : ['', ''];

    document.getElementById('nextInspectionYear').value = parts[0] || '';
    document.getElementById('nextInspectionMonth').value = parts[1] || '';
}

// Hier wird im Browser geprüft, ob das Baujahr nicht in der Zukunft liegt
// Zur Sicherheit wird dieselbe Regel auch im Backend geprüft
function isYearValid() {
    const year = Number(document.getElementById('year').value);

    return !year || year <= new Date().getFullYear();
}

// Hier wird geprüft, ob ein Pickerl schon überfällig ist
// Es werden Monate verglichen, weil beim Pickerl nur Monat und Jahr gespeichert werden
function isInspectionOverdue(vehicle) {
    const value = formatMonthInput(vehicle.nextInspectionDate);

    if (!value) {
        return false;
    }

    const parts = value.split('-');
    const dueMonthNumber = Number(parts[0]) * 12 + Number(parts[1]) - 1;
    const today = new Date();
    const currentMonthNumber = today.getFullYear() * 12 + today.getMonth();

    return dueMonthNumber < currentMonthNumber;
}

// Hier wird die CSS-Klasse zurückgegeben, falls das Pickerl überfällig ist
// Dadurch kann der Termin in Tabelle und Analyse rot markiert werden
function getInspectionClass(vehicle) {
    return isInspectionOverdue(vehicle) ? 'date-overdue' : '';
}

// Hier wird der Wert geliefert, nach dem im Ranking sortiert wird
function getRankingValue(vehicle, type) {
    if (type === 'monthlyMileage') {
        return getMonthlyMileage(vehicle);
    }

    return Number(vehicle[type]) || 0;
}

// Hier wird grob berechnet, wie viele Kilometer pro Monat gefahren wurden
// Dafür wird der Kilometerstand durch die Monate seit dem Baujahr geteilt
function getMonthlyMileage(vehicle) {
    if (!vehicle.year || !vehicle.mileage) {
        return 0;
    }

    const today = new Date();
    const months = Math.max(1, (today.getFullYear() - Number(vehicle.year)) * 12 + today.getMonth() + 1);

    return Math.round(Number(vehicle.mileage) / months);
}

// Hier werden die Werte im Ranking mit der passenden Einheit formatiert
function formatRankingValue(vehicle, type) {
    const value = getRankingValue(vehicle, type);

    if (type === 'consumption') {
        return value + formatConsumptionUnit(vehicle);
    }

    if (type === 'mileage') {
        return value + ' km';
    }

    if (type === 'monthlyMileage') {
        return value + ' km/Monat';
    }

    return value + ' kW';
}

// Hier wird je nach Antriebsart die passende Verbrauchseinheit zurückgegeben
function formatConsumptionUnit(vehicle) {
    if (!vehicle) {
        return '';
    }

    return vehicle.fuelType === 'Elektro' ? ' kWh/100 km' : ' l/100 km';
}

// Hier wird verhindert, dass Freitext aus der Historie als HTML ausgeführt wird
// Der eingegebene Text wird dadurch nur als Text angezeigt
function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[char];
    });
}

// Hier werden Buttons, Formulare und Filter mit den Funktionen verbunden
// Also was beim Speichern, Suchen, Filtern oder Ranking ändern passiert
form.addEventListener('submit', saveVehicle);
historyForm.addEventListener('submit', saveHistory);
historyVehicleSelect.addEventListener('change', updateSelectedHistoryVehicles);
cancelEditButton.addEventListener('click', resetForm);
searchInput.addEventListener('input', showVehicles);
fuelFilter.addEventListener('change', showVehicles);
rankingType.addEventListener('change', showRanking);
rankingDirection.addEventListener('change', showRanking);
rankingFuelFilter.addEventListener('change', showRanking);

// Beim Laden der Seite wird alles einmal vorbereitet
// Jahresgrenzen setzen, Fahrzeuge laden und Analyse anzeigen
setYearLimits();
loadVehicles();
loadAnalysis();
