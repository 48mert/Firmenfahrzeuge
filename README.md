# Firmenfahrzeugverwaltung

Einfache Webanwendung für ein webbasiertes Firmenfahrzeugverwaltungssystem.

## Start

```bash
npm install
npm run dev
```

Danach im Browser öffnen:

```text
http://localhost:3000
```

Fuer Hosting auf Render, Railway oder Azure App Service kann als Startbefehl verwendet werden:

```bash
npm start
```

## Dateien

- `app.js`: Express-Server, SQLite-Verbindung, Sequelize-Modell, REST-Endpunkte, Analyse-Endpunkt und Startdaten.
- `public/index.html`: Dashboard, Tabelle, Suchfeld, Filter, Formular und Fahrzeughistorie.
- `public/style.css`: Einfaches responsive Dashboard-Design.
- `public/script.js`: Laden, Anzeigen, Suchen, Filtern, Erstellen, Bearbeiten, Löschen, Historie und Analyseanzeige.
- `package.json`: Projektinformationen, Startskripte und notwendige Abhängigkeiten.

Die Datei `database.sqlite` wird beim Start automatisch von Sequelize erzeugt.

## Funktionen

- Fahrzeuge hinzufügen, bearbeiten und löschen.
- Kilometer, Kennzeichen, Zuordnung, Poolfahrzeug, Service und Pickerl bearbeiten.
- Pickerl wird als Monat/Jahr gespeichert, zum Beispiel `08/2026`.
- Services, Überprüfungen, Pickerltermine und Reparaturen als Historie beim Fahrzeug speichern.
- Auswertungen für Verbrauch, Kilometerstand und durchschnittliche monatliche Kilometer pro Auto.

## Team-Aufteilung

Person 1 arbeitet an `public/index.html` und `public/style.css`: Gestaltung, Tabelle und Formular.

Person 2 arbeitet an `app.js`: Express, Sequelize, Datenbankmodell und REST-Endpunkte.

Person 3 arbeitet an `public/script.js`, `README.md` und Testen: fetch(), Suche, Filter, Analyseanzeige und kurze Dokumentation.

## Hinweis zu Online-Hosting

Fuer die lokale FH-Demo reicht SQLite. Falls ein echter dauerhafter Node.js-Host eine externe Datenbank verlangt, kann Sequelize spaeter auf PostgreSQL umgestellt werden. Dazu wuerde man den Dialect und die Verbindungsdaten in `app.js` aendern und eine PostgreSQL-Datenbank beim Hosting-Anbieter anlegen. Die aktuelle Version bleibt bewusst einfach und verwendet SQLite.
