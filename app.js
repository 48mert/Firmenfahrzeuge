//Benötigte Bibliotheken importieren
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');

//Server initialisieren
const app = express();
const PORT = process.env.PORT || 3000; //Verwendet den angebenen Port oder standardmäßig Port 3000

//Express Middleware konfigurieren
app.use(express.json());
app.use(express.static('public'));

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite'
});

//Datenbanktabelle Vehicle (Fahrzeug) definieren
const Vehicle = sequelize.define('Vehicle', {

    //Fahrzeugmarke definieren (Pflichtfeld)
    brand: {
        type: DataTypes.STRING,
        allowNull: false
    },

    //Fahrzeugmodell definieren (Pflichtfeld)
    model: {
        type: DataTypes.STRING,
        allowNull: false
    },

    //Fahrzeugkennzeichen definieren (Pflichtfeld)
    licensePlate: {
        type: DataTypes.STRING,
        allowNull: false
    },

    //Baujahr definieren
    year: {
        type: DataTypes.INTEGER
    },

    //Kilometerstand definieren
    mileage: {
        type: DataTypes.INTEGER
    },

    //Kraftstoffart definieren
    fuelType: {
        type: DataTypes.STRING
    },

    //Verbrauch definieren
    consumption: {
        type: DataTypes.FLOAT
    },

    //Motorleistung definieren
    power: {
        type: DataTypes.INTEGER
    },

    //Zugeordneter Mitarbeiter definieren
    assignedUser: {
        type: DataTypes.STRING
    },

    //als Poolfahrzeug definieren
    isPoolVehicle: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },

    //Nächster Servicetermin definieren
    nextServiceDate: {
        type: DataTypes.DATEONLY
    },

    //Nächster Pickerltermin definieren
    nextInspectionDate: {
        type: DataTypes.STRING
    },

    //Sonstige Notizen definieren
    notes: {
        type: DataTypes.TEXT
    },

    //Service- und Reperaturhistorie definieren
    history: {
        type: DataTypes.TEXT,
        defaultValue: '[]'
    }
});



//Fahrzeugdaten aufbereiten
function prepareVehicleData(data, existingVehicle) {
    return {
        brand: data.brand,
        model: data.model,
        licensePlate: data.licensePlate,
        year: data.year || null,
        mileage: data.mileage || 0,
        fuelType: data.fuelType || '',
        consumption: data.consumption || 0,
        power: data.power || null,
        assignedUser: data.assignedUser || '',
        isPoolVehicle: data.isPoolVehicle === true,
        nextServiceDate: data.nextServiceDate || null,
        nextInspectionDate: getInspectionMonth(data.nextInspectionDate),
        notes: data.notes || '',
        history: data.history !== undefined
            ? data.history
            : (existingVehicle ? existingVehicle.history : '[]')
    };
}


//Hilfsfunktionen
function getInspectionMonth(value) {
    if (!value) {
        return null;
    }

    if (/^\d{4}-\d{2}/.test(value)) {
        const monthValue = value.substring(0, 7);
        const month = Number(monthValue.split('-')[1]);

        return month >= 1 && month <= 12 ? monthValue : null;
    }

    if (/^\d{2}\/\d{4}$/.test(value)) {
        const parts = value.split('/');
        const month = Number(parts[0]);

        return month >= 1 && month <= 12 ? parts[1] + '-' + parts[0] : null;
    }

    return null;
}


//Prüfen ob das Baujahr nicht in der Zukunft liegt
function isVehicleYearValid(data) {
    const year = Number(data.year);

    return !year || year <= new Date().getFullYear();
}


//Prüfen ob der Service in den nächsten 30 Tagen fällig ist
function isDueSoon(dateValue) {
    if (!dateValue) {
        return false;
    }

    const today = new Date();
    const dueDate = new Date(dateValue);
    const daysUntilDue = (dueDate - today) / (1000 * 60 * 60 * 24);

    return daysUntilDue >= 0 && daysUntilDue <= 30;
}


//Prüfen ob das Pickerl in den nächsten 30 Tagen fällig ist
function isMonthDueSoon(monthValue) {
    if (!monthValue) {
        return false;
    }

    const cleanMonthValue = getInspectionMonth(monthValue);

    if (!cleanMonthValue) {
        return false;
    }

    const today = new Date();
    const parts = cleanMonthValue.split('-');
    const dueYear = Number(parts[0]);
    const dueMonth = Number(parts[1]);

    if (!dueYear || !dueMonth) {
        return false;
    }

    const currentMonthNumber = today.getFullYear() * 12 + today.getMonth();
    const dueMonthNumber = dueYear * 12 + dueMonth - 1;
    const monthsUntilDue = dueMonthNumber - currentMonthNumber;

    return monthsUntilDue <= 1;
}


//Fahrzeughistorie von JSON-Text in JavaScript-Array umwandeln
function parseHistory(vehicle) {
    try {
        return JSON.parse(vehicle.history || '[]');
    } catch (error) {
        return [];
    }
}


//Durchschnittliche Monatliche Kilometerleistung berechnen (mittels Baujahr und Kilometerstand)
function getMonthlyMileage(vehicle) {
    if (!vehicle.year || !vehicle.mileage) {
        return 0;
    }

    const today = new Date();
    const months = Math.max(1, (today.getFullYear() - Number(vehicle.year)) * 12 + today.getMonth() + 1);

    return Math.round(Number(vehicle.mileage) / months);
}


//Datenbanktabelle Vehicles prüfen ob Spalte "History" existiert, wenn nicht Spalte hinzufügen
async function ensureHistoryColumn() {
    const table = await sequelize.getQueryInterface().describeTable('Vehicles');

    if (!table.history) {
        await sequelize.getQueryInterface().addColumn('Vehicles', 'history', {
            type: DataTypes.TEXT,
            defaultValue: '[]'
        });
    }
}


//Nächten Pickerltermin vereinheitlichen in folgendes Format: YYYY-MM
async function normalizeInspectionMonths() {
    const vehicles = await Vehicle.findAll();

    for (const vehicle of vehicles) {
        const monthValue = getInspectionMonth(vehicle.nextInspectionDate);

        if (monthValue && vehicle.nextInspectionDate !== monthValue) {
            await vehicle.update({ nextInspectionDate: monthValue });
        }

        if (!monthValue && vehicle.nextInspectionDate) {
            await vehicle.update({ nextInspectionDate: null });
        }
    }
}


//REST-API Endpunkte für Fahrzeuge 

//Alle Fahrzeuge laden
app.get('/api/vehicles', async (req, res) => {
    const vehicles = await Vehicle.findAll({
        order: [['brand', 'ASC'], ['model', 'ASC']]
    });

    res.json(vehicles);
});


//Fahrzeuge anhand von ID laden => wenn Fahrzeug ID nicht gefunden => eug nicht gefunden" zurückgeben
app.get('/api/vehicles/:id', async (req, res) => {
    const vehicle = await Vehicle.findByPk(req.params.id);

    if (!vehicle) {
        return res.status(404).json({ message: 'Fahrzeug nicht gefunden' });
    }

    res.json(vehicle);
});


//Fahrzeug anlgen (Neus Fahrzeug in der Datenbank eintreagen) => dabei Baujahr prüfen
app.post('/api/vehicles', async (req, res) => {
    if (!isVehicleYearValid(req.body)) {
        return res.status(400).json({ message: 'Baujahr darf nicht in der Zukunft liegen' });
    }

    try {
        const vehicle = await Vehicle.create(prepareVehicleData(req.body));
        res.status(201).json(vehicle);
    } catch (error) {
        res.status(400).json({ message: 'Fahrzeug konnte nicht erstellt werden' });
    }
});


//Fahrzeug aktualisieren (Daten eines Fahrzeuges in der Datenbank ändern) => dabei Baujahr prüfen
app.put('/api/vehicles/:id', async (req, res) => {
    const vehicle = await Vehicle.findByPk(req.params.id);

    if (!vehicle) {
        return res.status(404).json({ message: 'Fahrzeug nicht gefunden' });
    }

    if (!isVehicleYearValid(req.body)) {
        return res.status(400).json({ message: 'Baujahr darf nicht in der Zukunft liegen' });
    }

    try {
        await vehicle.update(prepareVehicleData(req.body, vehicle));
        res.json(vehicle);
    } catch (error) {
        res.status(400).json({ message: 'Fahrzeug konnte nicht aktualisiert werden' });
    }
});


//Fahrzeug aus der Datenbank löschen
app.delete('/api/vehicles/:id', async (req, res) => {
    const vehicle = await Vehicle.findByPk(req.params.id);

    if (!vehicle) {
        return res.status(404).json({ message: 'Fahrzeug nicht gefunden' });
    }

    await vehicle.destroy();
    res.json({ message: 'Fahrzeug gelöscht' });
});


//Service- und Reperaturhistorie eines Fahrzeuges eintragen/aktualisieren
app.post('/api/vehicles/:id/history', async (req, res) => {
    const vehicle = await Vehicle.findByPk(req.params.id);

    if (!vehicle) {
        return res.status(404).json({ message: 'Fahrzeug nicht gefunden' });
    }

    const history = parseHistory(vehicle);
    history.push({
        type: req.body.type || 'Service',
        date: req.body.date || '',
        text: req.body.text || ''
    });

    await vehicle.update({ history: JSON.stringify(history) });
    res.status(201).json(vehicle);
});


//Analysefunktion für den Fahrzeugfuhrpark
app.get('/api/analysis', async (req, res) => {
    const vehicles = await Vehicle.findAll();
    const vehiclesWithConsumption = vehicles.filter(vehicle => Number(vehicle.consumption) > 0);

    const totalConsumption = vehiclesWithConsumption.reduce((sum, vehicle) => {
        return sum + Number(vehicle.consumption);
    }, 0);

    const averageConsumption = vehiclesWithConsumption.length > 0
        ? totalConsumption / vehiclesWithConsumption.length
        : 0;

    const lowestConsumptionVehicle = vehiclesWithConsumption.reduce((lowest, vehicle) => {
        if (!lowest || Number(vehicle.consumption) < Number(lowest.consumption)) {
            return vehicle;
        }

        return lowest;
    }, null);

    const highestMileageVehicle = vehicles.reduce((highest, vehicle) => {
        if (!highest || Number(vehicle.mileage) > Number(highest.mileage)) {
            return vehicle;
        }

        return highest;
    }, null);

    const highestConsumptionVehicle = vehiclesWithConsumption.reduce((highest, vehicle) => {
        if (!highest || Number(vehicle.consumption) > Number(highest.consumption)) {
            return vehicle;
        }

        return highest;
    }, null);

    const consumptionRanking = [...vehiclesWithConsumption].sort((a, b) => {
        return Number(b.consumption) - Number(a.consumption);
    });

    const mileageRanking = [...vehicles].sort((a, b) => {
        return Number(b.mileage) - Number(a.mileage);
    });

    const monthlyMileageRanking = vehicles.map(vehicle => {
        const plainVehicle = vehicle.toJSON();
        plainVehicle.monthlyMileage = getMonthlyMileage(vehicle);
        return plainVehicle;
    }).sort((a, b) => {
        return Number(b.monthlyMileage) - Number(a.monthlyMileage);
    });

    res.json({
        vehicleCount: vehicles.length,
        averageConsumption: Number(averageConsumption.toFixed(2)),
        lowestConsumptionVehicle,
        highestConsumptionVehicle,
        highestMileageVehicle,
        vehiclesWithServiceSoon: vehicles.filter(vehicle => isDueSoon(vehicle.nextServiceDate)),
        vehiclesWithInspectionSoon: vehicles.filter(vehicle => isMonthDueSoon(vehicle.nextInspectionDate)),
        consumptionRanking,
        mileageRanking,
        monthlyMileageRanking
    });
});


//Beispieldaten bei Start in die Datenbank einfügen, wenn keine Fahrzeuge vorhanden sind
async function insertStartData() {
    const count = await Vehicle.count();

    if (count > 0) {
        return;
    }

    await Vehicle.bulkCreate([
        {
            brand: 'VW',
            model: 'Golf Variant',
            licensePlate: 'W-12345F',
            year: 2021,
            mileage: 84200,
            fuelType: 'Diesel',
            consumption: 5.1,
            power: 110,
            assignedUser: 'Max Berger',
            isPoolVehicle: false,
            nextServiceDate: '2026-08-10',
            nextInspectionDate: '2026-09',
            notes: 'Regelmäßig für Kundentermine im Einsatz.',
            history: JSON.stringify([
                { type: 'Service', date: '2026-02-14', text: 'Ölwechsel und Bremsen kontrolliert.' }
            ])
        },
        {
            brand: 'Skoda',
            model: 'Octavia',
            licensePlate: 'W-98765F',
            year: 2022,
            mileage: 45600,
            fuelType: 'Benzin',
            consumption: 6.3,
            power: 96,
            assignedUser: '',
            isPoolVehicle: true,
            nextServiceDate: '2026-07-28',
            nextInspectionDate: '2027-01',
            notes: 'Poolfahrzeug für kurze Fahrten.',
            history: JSON.stringify([
                { type: 'Reparatur', date: '2026-03-03', text: 'Reifen vorne erneuert.' }
            ])
        },
        {
            brand: 'Tesla',
            model: 'Model 3',
            licensePlate: 'W-55555E',
            year: 2023,
            mileage: 29100,
            fuelType: 'Elektro',
            consumption: 15.8,
            power: 208,
            assignedUser: 'Anna Hofer',
            isPoolVehicle: false,
            nextServiceDate: '2026-12-05',
            nextInspectionDate: '2026-08',
            notes: 'Verbrauch in kWh pro 100 km.',
            history: JSON.stringify([
                { type: 'Pickerl', date: '2025-08-12', text: 'Pickerl ohne Mängel.' }
            ])
        }
    ]);
}

// Datenbank synchronisieren und Server starten
sequelize.sync().then(async () => {
    await ensureHistoryColumn();
    await normalizeInspectionMonths();
    await insertStartData();

    app.listen(PORT, () => {
        console.log('Server läuft auf http://localhost:' + PORT);
    });
});
