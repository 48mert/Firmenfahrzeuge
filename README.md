# Firmenfahrzeugverwaltung

Das ist eine einfache Webanwendung für die Verwaltung von Firmenfahrzeugen. Man kann Fahrzeuge erfassen, bearbeiten, löschen, filtern und zusätzliche Historieneinträge wie Service, Pickerl oder Reparaturen speichern.

## Lokal starten

Zuerst die Abhängigkeiten installieren:

```bash
npm install
```

Danach die Anwendung starten:

```bash
npm run dev
```

Dann im Browser öffnen:

```text
http://localhost:3000
```

Alternativ kann auch dieser Befehl verwendet werden:

```bash
npm start
```

## Online-Version

Die Anwendung wurde für die Abgabe online auf Render gehostet:

```text
https://firmenfahrzeuge.onrender.com
```

Render wurde verwendet, weil Azure App Service mit dem Student-Account durch eine Azure-Policy blockiert wurde. 
Wichtig: Der kostenlose Render-Plan kann die Anwendung nach einiger Zeit ohne Besucher schlafen legen. Beim ersten Öffnen kann das Laden deshalb kurz dauern. Für die Präsentation sollte die Seite ein paar Minuten vorher geöffnet und getestet werden.

Für das Hosting auf Render wurden diese Einstellungen verwendet:

- Repository: GitHub-Repository `48mert/Firmenfahrzeuge`
- Runtime/Language: Node
- Branch: `main`
- Build Command: `npm install`
- Start Command: `npm start` oder `node app.js`

## Dateien

- `app.js`: Hier stehen der Express-Server, die SQLite-Verbindung, das Sequelize-Modell, die REST-Endpunkte, der Analyse-Endpunkt und die Startdaten.
- `public/index.html`: Hier ist die Grundstruktur der Webseite mit Dashboard, Tabelle, Suchfeld, Filter, Formular und Fahrzeughistorie.
- `public/style.css`: Hier wird das einfache und responsive Dashboard-Design festgelegt.
- `public/script.js`: Hier passiert die Logik im Browser, also Laden, Anzeigen, Suchen, Filtern, Erstellen, Bearbeiten, Löschen, Historie und Analyseanzeige.
- `package.json`: Hier stehen Projektinformationen, Startbefehle und die notwendigen Abhängigkeiten.

Die Datei `database.sqlite` wird beim Start automatisch von Sequelize erzeugt.

## Funktionen

- Fahrzeuge können hinzugefügt, bearbeitet und gelöscht werden.
- Kilometerstand, Kennzeichen, zugeordnete Person, Poolfahrzeug, Service und Pickerl können geändert werden.
- Das Pickerl wird als Monat/Jahr gespeichert, zum Beispiel `08/2026`.
- Services, Überprüfungen, Pickerltermine und Reparaturen können als Historie beim Fahrzeug gespeichert werden.
- Es gibt einfache Auswertungen für Verbrauch, Kilometerstand und durchschnittliche monatliche Kilometer pro Auto.

## Zuständigkeiten

Akram: `public/index.html` und `public/style.css`; Gestaltung, Tabelle und Formular

Michael: `app.js`; Express, Sequelize, Datenbankmodell und REST-Endpunkte

Mert: `public/script.js`, `README.md` und Testen: `fetch()`, Suche, Filter, Analyseanzeige und kurze Dokumentation

## Hinweis zu Online-Hosting

Für die lokale FH-Demo reicht SQLite aus. Für dauerhaftes Online-Hosting wäre SQLite aber nicht ideal, weil die Datenbank nur als Datei gespeichert wird. Wenn die App bei Render neu startet oder neu deployed wird, können gespeicherte Daten eventuell verloren gehen.

Für eine echte dauerhafte Online-Version könnte Sequelize später auf PostgreSQL umgestellt werden. Dafür würde man den Dialect und die Verbindungsdaten in `app.js` ändern und beim Hosting-Anbieter eine PostgreSQL-Datenbank anlegen. Für dieses Projekt bleibt die Version bewusst einfach und verwendet SQLite.
