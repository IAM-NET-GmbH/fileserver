# Development Guide - IAM File Server

## 🚀 Schnellstart mit Make

Das Makefile bietet einfache Befehle für alle Entwicklungsaufgaben:

```bash
# Projekt einrichten
make setup

# Entwicklungsserver starten
make dev

# Mit Docker entwickeln
make docker-dev

# Produktion mit Docker
make docker-prod
```

## 📋 Wichtige Make-Befehle

### 🔧 Setup & Installation
```bash
make setup          # Komplettes Projekt-Setup
make install         # Dependencies installieren
make build          # Alle Pakete für Produktion builden
make clean          # Aufräumen (build artifacts, dependencies)
```

### 🚀 Entwicklung
```bash
make dev            # Frontend + Backend gleichzeitig starten
make dev-backend    # Nur Backend starten (Port 3001)
make dev-frontend   # Nur Frontend starten (Port 5173)
make watch-logs     # Logs in Echtzeit verfolgen
```

### 🐳 Docker-Entwicklung
```bash
make docker-dev     # Docker-Entwicklungsumgebung starten
make docker-prod    # Produktionsumgebung mit Traefik/HTTPS
make docker-stop    # Container stoppen
make docker-restart # Container neu starten
make docker-rebuild # Komplett neu builden und starten
make docker-clean   # Alles bereinigen (Container, Images, Volumes)
```

### 📊 Monitoring & Status
```bash
make health         # Anwendungsstatus prüfen
make status         # Docker-Container-Status anzeigen
make logs          # Container-Logs anzeigen
make shell         # Shell in Container öffnen
make urls          # Wichtige URLs anzeigen
```

### 🗄️ Datenbank-Management
```bash
make db-backup      # SQLite-Datenbank sichern
make db-restore BACKUP_FILE=backup/file.db  # Datenbank wiederherstellen
```

### ⚡ Shortcuts
```bash
make start         # = docker-dev
make stop          # = docker-stop  
make restart       # = docker-restart
make rebuild       # = docker-rebuild
```

## 🛠️ Entwicklungsworkflow

### 1. Erstmalige Einrichtung
```bash
# 1. Projekt klonen
git clone <repository-url>
cd fileserver

# 2. Umgebung einrichten
make setup

# 3. BMW-Zugangsdaten in .env eintragen
nano .env

# 4. Entwicklung starten
make dev
```

### 2. Tägliche Entwicklung
```bash
# Lokale Entwicklung
make dev                    # Startet beide Server
# → Frontend: http://localhost:5173
# → Backend:  http://localhost:3001

# Docker-Entwicklung (empfohlen)
make docker-dev            # Startet komplette Umgebung
make logs                  # Logs verfolgen
```

### 3. Deployment-Test
```bash
# Produktionsumgebung lokal testen
make docker-prod           # Mit Traefik + HTTPS
# → https://fileserver.terhorst.io (DNS erforderlich)
```

## 🔍 Debugging & Problemlösung

### Container-Debugging
```bash
make shell                 # In Container einloggen
make logs                  # Live-Logs anzeigen
make status               # Container-Status prüfen
make health               # Anwendungsstatus prüfen
```

### Umgebung überprüfen
```bash
make check-node           # Node.js Version prüfen
make check-docker         # Docker Installation prüfen
make check-env            # .env Datei prüfen
```

### Bei Problemen
```bash
make docker-clean         # Alles bereinigen
make docker-rebuild       # Neu aufbauen
make emergency-stop       # Notfall-Stopp aller Container
```

## 🗂️ Projektstruktur

```
fileserver/
├── backend/              # Express.js API
├── frontend/             # React SPA
├── shared/               # Gemeinsame TypeScript Types
├── providers/            # Download-Provider (BMW, etc.)
├── docker-compose.yml    # Docker-Konfiguration
├── Makefile             # Automation-Befehle
├── .env.example         # Umgebungsvorlage
└── README.md            # Hauptdokumentation
```

## 🌐 Wichtige URLs

```bash
# Entwicklung
Frontend:     http://localhost:5173
Backend API:  http://localhost:3001/api
Health Check: http://localhost:3001/api/health
Dashboard:    http://localhost:3001

# Produktion  
Website:      https://fileserver.terhorst.io
API:          https://fileserver.terhorst.io/api
Traefik:      http://localhost:8080 (nur lokal)
```

## 📦 Package-Management

```bash
# Dependencies verwalten
make update               # Alle Dependencies aktualisieren
npm install <package>     # Neues Package hinzufügen
npm run build --workspace=shared  # Einzelnes Package builden
```

## 🔒 Produktion

### Deployment auf fileserver.terhorst.io
```bash
# 1. Server vorbereiten
scp -r . user@fileserver.terhorst.io:/opt/iam-fileserver/

# 2. Auf Server
cd /opt/iam-fileserver
make setup-prod           # Produktions-Setup
make docker-prod          # Starten mit Traefik/HTTPS
```

### Wartung
```bash
make db-backup            # Regelmäßige Backups
make logs                 # Logs überwachen
make health               # Status prüfen
```

## 💡 Tipps

- **Verwende `make dev` für schnelle Entwicklung** mit Hot-Reload
- **Verwende `make docker-dev` für Produktions-ähnliche Tests**
- **`.env` Datei niemals committen** (steht in .gitignore)
- **`make help` zeigt alle verfügbaren Befehle**
- **Logs mit `make logs` verfolgen** bei Problemen

## 🆘 Hilfe

```bash
make help                 # Alle Befehle anzeigen
make info                # Projektinformationen
make urls                # Wichtige URLs
make check-env           # Konfiguration prüfen
```
