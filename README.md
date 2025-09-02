# IAM File Server

Ein moderner, automatisierter Download-Management-Server mit einer schönen Web-Oberfläche für fileserver.terhorst.io.

## 🚀 Features

- **Automatisierte Downloads**: Regelmäßige Überprüfung von Providern auf neue Software-Versionen
- **BMW AOS Integration**: Spezieller Provider für BMW Aftermarket Online Services (ISTA-P und ISTA-Next)
- **Moderne Web-UI**: React-basierte Benutzeroberfläche mit IAM-NET Corporate Design
- **RESTful API**: Vollständige API für alle Funktionen mit Health-Check-Endpunkten
- **Responsive Design**: Optimiert für Desktop, Tablet und Mobile
- **Docker-ready**: Vollständige Containerisierung für einfaches Deployment
- **TypeScript**: Vollständig typisiert für bessere Entwicklererfahrung
- **Echtzeit-Updates**: Live-Status-Updates und Benachrichtigungen

## 🏗️ Architektur

```
├── backend/          # Express.js API Server (TypeScript)
├── frontend/         # React SPA mit Vite (TypeScript)
├── shared/           # Gemeinsame Types und Utilities
├── providers/        # Download-Provider (BMW AOS, etc.)
└── docker/           # Docker-Konfiguration
```

### Tech Stack

**Backend:**
- Node.js + Express.js
- TypeScript
- SQLite (mit Knex.js)
- Playwright (für Web-Scraping)
- Winston (Logging)
- Cron (Scheduling)

**Frontend:**
- React 18
- TypeScript
- Vite (Build Tool)
- TailwindCSS (Styling)
- React Query (State Management)
- React Router (Navigation)
- Lucide Icons

## 📋 Voraussetzungen

- Node.js 18+ oder Docker
- BMW AOS Account (für BMW Provider)

## 🚀 Installation

### Option 1: Docker (Empfohlen)

1. **Repository klonen:**
```bash
git clone <repository-url>
cd fileserver
```

2. **Environment-Variablen konfigurieren:**
```bash
cp .env.example .env
# Bearbeiten Sie .env mit Ihren BMW-Zugangsdaten
```

3. **Container starten:**
```bash
# Nur File Server
docker-compose up -d fileserver

# Mit Traefik Reverse Proxy (für Produktion)
docker-compose --profile proxy up -d
```

### Option 2: Lokale Entwicklung

1. **Dependencies installieren:**
```bash
npm install
```

2. **Shared Types builden:**
```bash
npm run build:shared
```

3. **Environment-Variablen setzen:**
```bash
cp .env.example .env
# .env Datei bearbeiten
```

4. **Backend starten:**
```bash
npm run dev:backend
```

5. **Frontend starten (neues Terminal):**
```bash
npm run dev:frontend
```

## ⚙️ Konfiguration

### Environment-Variablen

```env
# Server Konfiguration
NODE_ENV=production
PORT=3001

# BMW AOS Provider
BMW_USERNAME=ihr-bmw-username
BMW_PASSWORD=ihr-bmw-passwort
BMW_AUTH_URL=https://aos.bmwgroup.com/auth/login
BMW_ISTA_P_URL=https://aos.bmwgroup.com/ista-p
BMW_ISTA_NEXT_URL=https://aos.bmwgroup.com/ista-next

# System
CHECK_INTERVAL_HOURS=6
DOWNLOAD_PATH=./downloads
DATABASE_PATH=./data
HEADLESS=true
```

### BMW AOS Provider Setup

1. Stellen Sie sicher, dass Sie gültige BMW AOS Zugangsdaten haben
2. Setzen Sie `BMW_USERNAME` und `BMW_PASSWORD` in der `.env` Datei
3. Der Provider wird automatisch beim ersten Start konfiguriert
4. Sie können den Provider über die Web-UI aktivieren/deaktivieren

## 🌐 API Endpunkte

### Health Check
```
GET /api/health           # Vollständiger Systemstatus
GET /api/health/status    # Einfacher Status
GET /api/health/providers # Provider-spezifische Health-Informationen
```

### Downloads
```
GET /api/downloads                # Liste aller Downloads (mit Filterung/Pagination)
GET /api/downloads/:id           # Download-Details
GET /api/downloads/:id/download  # Datei herunterladen
DELETE /api/downloads/:id        # Download löschen
GET /api/downloads/stats         # Download-Statistiken
```

### Provider
```
GET /api/providers               # Liste aller Provider
GET /api/providers/:id           # Provider-Details
POST /api/providers/:id/enable   # Provider aktivieren
POST /api/providers/:id/disable  # Provider deaktivieren
POST /api/providers/:id/check    # Provider manuell überprüfen
POST /api/providers/check-all    # Alle Provider überprüfen
PUT /api/providers/:id/config    # Provider-Konfiguration aktualisieren
```

## 🔧 Verwendung

1. **Web-Interface öffnen:** `http://localhost:3001` (oder Ihre Domain)

2. **Provider konfigurieren:**
   - Navigieren Sie zu "Provider"
   - BMW AOS Provider aktivieren
   - Überprüfen Sie die Konfiguration

3. **Downloads verwalten:**
   - Automatische Downloads alle 6 Stunden (konfigurierbar)
   - Manuelle Überprüfung über "Provider prüfen" Button
   - Downloads über die Web-UI verwalten

4. **Monitoring:**
   - Dashboard zeigt Systemstatus
   - Health-Check-Endpunkte für externe Monitoring
   - Logs in `./logs/` Verzeichnis

## 🚢 Deployment für fileserver.terhorst.io

### Docker mit Traefik (Empfohlen)

1. **Server vorbereiten:**
```bash
# Docker und Docker Compose installieren
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Repository auf Server klonen
git clone <repository-url> /opt/iam-fileserver
cd /opt/iam-fileserver
```

2. **Production Environment:**
```bash
# .env für Produktion erstellen
cp .env.example .env
# BMW-Zugangsdaten und Domain setzen
```

3. **Container starten:**
```bash
# Mit Traefik für HTTPS
docker-compose --profile proxy up -d
```

4. **Domain-Konfiguration:**
   - DNS A-Record für `fileserver.terhorst.io` auf Server-IP
   - Traefik übernimmt automatisch HTTPS via Let's Encrypt

### Systemd Service (Alternative)

```bash
# Service-Datei erstellen
sudo cat > /etc/systemd/system/iam-fileserver.service << EOF
[Unit]
Description=IAM File Server
After=network.target

[Service]
Type=forking
User=fileserver
WorkingDirectory=/opt/iam-fileserver
Environment=NODE_ENV=production
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Service aktivieren
sudo systemctl enable iam-fileserver
sudo systemctl start iam-fileserver
```

## 🔍 Monitoring & Debugging

### Health Checks
```bash
# System Status prüfen
curl http://localhost:3001/api/health

# Einfacher Ping
curl http://localhost:3001/ping
```

### Logs
```bash
# Container Logs (Docker)
docker-compose logs -f fileserver

# Log-Dateien (lokale Installation)
tail -f logs/fileserver.log
```

### Debugging
```bash
# Debug-Modus aktivieren
export DEBUG=true

# Container mit interaktiver Shell
docker-compose exec fileserver sh
```

## 🛠️ Entwicklung

### Lokale Entwicklung starten
```bash
npm install
npm run dev
```

### Code-Qualität
```bash
# TypeScript Check
npm run build

# Linting (falls konfiguriert)
npm run lint
```

### Neue Provider hinzufügen

1. **Provider-Klasse erstellen:**
```typescript
// providers/src/MyProvider.ts
import { BaseProvider, ProviderDownload } from './BaseProvider';

export class MyProvider extends BaseProvider {
  async checkForUpdates(): Promise<ProviderDownload[]> {
    // Implementierung
  }
  
  async downloadFile(download: ProviderDownload, targetPath: string): Promise<boolean> {
    // Implementierung
  }
}
```

2. **Provider registrieren:**
```typescript
// backend/src/services/ProviderService.ts
switch (config.id) {
  case 'my-provider':
    provider = new MyProvider(config);
    break;
}
```

## 📁 Verzeichnisstruktur

```
/opt/iam-fileserver/
├── data/                 # SQLite Datenbank
├── downloads/            # Heruntergeladene Dateien
│   └── bmw-aos/         # Nach Provider organisiert
│       ├── ista-p/
│       └── ista-next/
├── logs/                # Log-Dateien
├── docker-compose.yml
├── .env                 # Environment-Konfiguration
└── ...
```

## 🔒 Sicherheit

- **Container Security**: Non-root User, Read-only Filesystem
- **Network Security**: Isolierte Docker-Netzwerke
- **Access Control**: IP-Whitelist konfigurierbar
- **HTTPS**: Automatisch via Traefik und Let's Encrypt
- **Secrets**: Environment-Variablen für sensible Daten

## 🔧 Wartung

### Updates
```bash
cd /opt/iam-fileserver
git pull origin main
docker-compose build --no-cache
docker-compose up -d
```

### Backups
```bash
# Datenbank-Backup
docker cp iam-fileserver:/app/data ./backup/

# Download-Backup (optional, große Dateien)
docker cp iam-fileserver:/app/downloads ./backup/
```

### Bereinigung
```bash
# Alte Downloads löschen (wird automatisch gemacht)
# Oder manuell via API: DELETE /api/downloads/:id

# Docker-Bereinigung
docker system prune -f
```

## 📊 Monitoring Metriken

- **System Health**: `/api/health`
- **Uptime**: Systemlaufzeit
- **Provider Status**: Anzahl aktiver/fehlerhafter Provider
- **Download Stats**: Anzahl Downloads, Speicherverbrauch
- **Disk Usage**: Verfügbarer Speicherplatz

## 🤝 Support

Bei Problemen oder Fragen:

1. **Logs prüfen**: `docker-compose logs fileserver`
2. **Health Status**: `curl http://localhost:3001/api/health`
3. **GitHub Issues**: Für Bugs und Feature-Requests
4. **Administrator kontaktieren**: admin@terhorst.io

## 📄 Lizenz

Dieses Projekt ist für IAM-NET.eu entwickelt. Alle Rechte vorbehalten.

---

**IAM File Server v1.0** - Entwickelt für fileserver.terhorst.io
