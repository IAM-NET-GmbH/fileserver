import { chromium, Browser, BrowserContext, Page } from 'playwright';
import axios from 'axios';
import fs from 'fs-extra';
import { createWriteStream } from 'fs';
import path from 'path';
import { Provider, ProviderStatus } from '@iam-fileserver/shared';
import { BaseProvider, ProviderDownload } from './BaseProvider';

interface BMWConfig {
  username: string;
  password: string;
  authUrl: string;
  istaPUrl: string;
  istaNextUrl: string;
  headless: boolean;
  downloadPath: string; // Where to save downloaded files
}

export class BMWProvider extends BaseProvider {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private isLoggedIn: boolean = false;

  private downloadCategories = {
    'ista-p': {
      'installer': 'Installationsprogramm ISTA/P',
      'data_archive': 'Datenarchiv ISTA/P'
    },
    'ista-next': {
      'client': 'Installationsdatei ISTA Client',
      'programming_data': 'ISTA Programmierdaten',
      'icom_firmware': 'ICOM Next Firmware',
      'ptd_driver': 'BMW PTD-Treiber'
    }
  };

  constructor(config: Provider) {
    super(config);
  }

  private getBMWConfig(): BMWConfig {
    return this.config.config as BMWConfig;
  }

  async initialize(): Promise<void> {
    this.logger.info('🚀 BMW Provider wird initialisiert...');
    
    const config = this.getBMWConfig();
    
    // Ensure download directory exists
    await fs.ensureDir(config.downloadPath);
    
    await this.launchBrowser();
    this.updateStatus(ProviderStatus.ACTIVE);
  }

  private async launchBrowser(): Promise<void> {
    this.logger.info('🌐 Starte Browser...');
    
    const config = this.getBMWConfig();
    
    // Auto-detect display availability for SSH environments
    const hasDisplay = process.env.DISPLAY !== undefined;
    const isSSH = process.env.SSH_CLIENT !== undefined || process.env.SSH_TTY !== undefined;
    
    let shouldUseHeadless = config.headless;
    
    // Auto-switch to headless if no display is available
    if (!config.headless && !hasDisplay && isSSH) {
      this.logger.warn('⚠️ Kein Display verfügbar (SSH ohne X11). Wechsle zu headless: true');
      this.logger.info('💡 Tipp: Verwenden Sie "xvfb-run -a npm run dev:backend" für virtuellen Display');
      shouldUseHeadless = true;
    }
    
    this.logger.info(`🖥️ Browser-Modus: ${shouldUseHeadless ? 'headless' : 'headed'} (Display: ${hasDisplay ? 'verfügbar' : 'nicht verfügbar'})`);
    
    this.browser = await chromium.launch({
      headless: shouldUseHeadless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'de-DE',
      acceptDownloads: true,
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    this.page = await this.context.newPage();

    if (process.env.DEBUG === 'true') {
      this.page.on('console', msg => {
        if (msg.type() === 'error') {
          this.logger.debug(`Browser Console Error: ${msg.text()}`);
        }
      });
    }
    
    this.logger.info('✅ Browser erfolgreich gestartet');
  }

  async checkForUpdates(): Promise<ProviderDownload[]> {
    this.logger.info('🔍 Prüfe auf BMW Updates...');
    
    if (!this.isLoggedIn) {
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        throw new Error('BMW Login fehlgeschlagen');
      }
    }

    const allDownloads: ProviderDownload[] = [];

    // Check ISTA-P
    this.logger.info('📥 Prüfe ISTA-P Downloads...');
    const istaPDownloads = await this.checkApplicationUpdates('ista-p');
    allDownloads.push(...istaPDownloads);

    // Wait between applications
    await this.delay(5000);

    // Check ISTA-Next
    this.logger.info('📥 Prüfe ISTA-Next Downloads...');
    const istaNextDownloads = await this.checkApplicationUpdates('ista-next');
    allDownloads.push(...istaNextDownloads);

    this.updateLastCheck(new Date());
    return allDownloads;
  }

  private async login(): Promise<boolean> {
    if (this.isLoggedIn || !this.page) {
      this.logger.info('✅ Bereits eingeloggt');
      return this.isLoggedIn;
    }

    this.logger.info('🔐 Logge bei BMW ein...');
    
    try {
      const config = this.getBMWConfig();
      
      // Navigate to auth page with longer timeout
      this.logger.debug('Navigiere zur Anmelde-Seite...');
      await this.page.goto(config.authUrl, {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      // Wait for login form with longer timeout
      this.logger.debug('Warte auf Login-Formular...');
      await this.page.waitForSelector('input[name="j_username"], input[type="text"]', { 
        timeout: 20000 
      });

      // Fill credentials
      this.logger.debug('Fülle Anmeldedaten aus...');
      await this.page.fill('input[name="j_username"], input[type="text"]', config.username);
      await this.page.fill('input[name="j_password"], input[type="password"]', config.password);

      // Click login button
      this.logger.debug('Klicke Login-Button...');
      await this.page.click('button[type="submit"], input[type="submit"]');

      // Wait for redirect with multiple fallbacks
      this.logger.debug('Warte auf Weiterleitung...');
      try {
        await this.page.waitForURL('**/startpage-workshop**', { timeout: 60000 });
        this.logger.debug('Erfolgreich zu startpage-workshop weitergeleitet');
      } catch (error) {
        this.logger.debug('Fallback: Warte auf aos.bmwgroup.com...');
        await this.page.waitForURL('https://aos.bmwgroup.com/**', { timeout: 60000 });
        this.logger.debug('Erfolgreich zu aos.bmwgroup.com weitergeleitet');
      }

      // Additional wait for page to fully load
      await this.page.waitForLoadState('networkidle');
      await this.delay(2000); // Additional 2 second wait

      // Verify login success
      const currentUrl = this.page.url();
      this.logger.debug(`Aktuelle URL nach Login: ${currentUrl}`);
      
      if (currentUrl.includes('startpage-workshop') || currentUrl.includes('aos.bmwgroup.com')) {
        this.isLoggedIn = true;
        this.logger.info('✅ Login erfolgreich!');
        return true;
      } else {
        throw new Error(`Login verification failed - URL: ${currentUrl}`);
      }
    } catch (error) {
      this.logger.error(`❌ Login fehlgeschlagen: ${error}`);
      this.updateStatus(ProviderStatus.ERROR);
      return false;
    }
  }

  private async checkApplicationUpdates(appType: 'ista-p' | 'ista-next'): Promise<ProviderDownload[]> {
    const config = this.getBMWConfig();
    const appUrl = appType === 'ista-p' ? config.istaPUrl : config.istaNextUrl;
    const appName = appType === 'ista-p' ? 'ISTA-P' : 'ISTA-Next';

    this.logger.info(`🧭 Navigiere zu ${appName}...`);

    try {
      if (!this.page) throw new Error('Browser page not available');

      // Navigate directly to the application with extended timeout
      this.logger.debug(`Lade ${appName} Seite: ${appUrl}`);
      await this.page.goto(appUrl, {
        waitUntil: 'networkidle',
        timeout: 90000 // Increased timeout to 90 seconds
      });

      // Wait for the page to load completely
      await this.page.waitForLoadState('domcontentloaded');
      await this.delay(5000); // Increased wait time

      const currentUrl = this.page.url();
      this.logger.debug(`✅ Erfolgreich zu ${appName} navigiert: ${currentUrl}`);

      const downloads = await this.findDownloads(appType);
      this.logger.info(`✅ ${downloads.length} Downloads für ${appName} gefunden`);

      return downloads;
    } catch (error) {
      this.logger.error(`❌ Fehler beim Prüfen von ${appName}: ${error}`);
      return [];
    }
  }

  private async findDownloads(appType: 'ista-p' | 'ista-next'): Promise<ProviderDownload[]> {
    if (!this.page) return [];

    const appName = appType === 'ista-p' ? 'ISTA-P' : 'ISTA-Next';
    this.logger.info(`🔍 Suche nach Downloads auf der ${appName} Seite...`);

    try {
      // Wait for the page to be fully loaded
      await this.page.waitForLoadState('domcontentloaded');
      await this.delay(3000); // Wait for dynamic content to load

      // Wait for frames to load
      this.logger.debug('Warte auf Frames...');
      try {
        await this.page.waitForFunction(() => {
          const frames = document.querySelectorAll('iframe');
          return frames.length > 0;
        }, { timeout: 15000 }); // Increased timeout
        this.logger.debug('Frames gefunden');
      } catch (e) {
        this.logger.debug('Keine Frames gefunden, suche nur in Hauptseite');
      }

    const downloadsData = await this.page.evaluate(() => {
      const foundDownloads: any[] = [];

      function searchForDownloads(doc: Document, frameInfo: string = 'main') {
        const links = doc.querySelectorAll('a[href]');
        links.forEach(link => {
          const href = (link as HTMLAnchorElement).href;
          const text = link.textContent?.trim() || '';

          if (href.toLowerCase().includes('.pdf') || text.toLowerCase().includes('.pdf')) {
            return;
          }

          if (href && href.includes('/api/v2/downloads') && text) {
            foundDownloads.push({
              title: text,
              url: href,
              method: `link_search_${frameInfo}`
            });
          }
        });

        const buttons = doc.querySelectorAll('button, [role="button"]');
        buttons.forEach(button => {
          const text = button.textContent?.trim() || '';
          const onclick = button.getAttribute('onclick');
          
          if (text && onclick && onclick.includes('download')) {
            foundDownloads.push({
              title: text,
              url: onclick,
              method: `button_search_${frameInfo}`
            });
          }
        });
      }

      searchForDownloads(document, 'main');

      const frames = document.querySelectorAll('iframe');
      frames.forEach((frame, index) => {
        try {
          const frameDoc = (frame as HTMLIFrameElement).contentDocument || 
                          (frame as HTMLIFrameElement).contentWindow?.document;
          if (frameDoc) {
            searchForDownloads(frameDoc, `frame_${index}`);
          }
        } catch (e) {
          // Frame might be cross-origin and inaccessible
        }
      });

      return foundDownloads;
    });

    const downloads: ProviderDownload[] = [];
    const categories = this.downloadCategories[appType];

    for (const rawDownload of downloadsData) {
      const category = this.categorizeDownload(rawDownload.title, Object.keys(categories));
      const version = this.extractVersion(rawDownload.title);

      if (category) {
        downloads.push({
          title: rawDownload.title,
          version,
          url: rawDownload.url,
          category,
          displayName: categories[category as keyof typeof categories] || rawDownload.title,
          method: rawDownload.method,
          metadata: {
            appType,
            rawTitle: rawDownload.title
          }
        });
      }
          }

    return downloads;
    } catch (error) {
      this.logger.error(`❌ Fehler beim Suchen nach Downloads: ${error}`);
      return [];
    }
  }

  private categorizeDownload(title: string, categories: string[]): string | null {
    const titleLower = title.toLowerCase();
    
    for (const category of categories) {
      const categoryLower = category.toLowerCase();
      if (titleLower.includes(categoryLower) || 
          titleLower.includes(categoryLower.replace('_', ' '))) {
        return category;
      }
    }

    // Additional categorization logic
    if (titleLower.includes('installer') || titleLower.includes('setup')) {
      return 'installer';
    }
    if (titleLower.includes('data') || titleLower.includes('daten')) {
      return 'data_archive';
    }
    if (titleLower.includes('client')) {
      return 'client';
    }
    if (titleLower.includes('firmware')) {
      return 'icom_firmware';
    }

    return null;
  }

  private extractVersion(title: string): string {
    const versionPatterns = [
      /v?(\d+\.\d+\.\d+)/i,
      /(\d+\.\d+)/,
      /(\d{4}-\d{2})/,
      /(\d{8})/
    ];

    for (const pattern of versionPatterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return 'unknown';
  }

  async downloadFile(download: ProviderDownload, targetPath: string): Promise<boolean> {
    this.logger.info(`📥 Lade herunter: ${download.displayName}`);

    try {
      const config = this.getBMWConfig();
      
      // Create filename based on category and original title
      const category = download.category;
      const fileName = download.title;
      const storageDir = path.join(config.downloadPath, category);
      
      // Ensure storage directory exists
      await fs.ensureDir(storageDir);
      
      // Define the storage path in the BMW folder
      const storagePath = path.join(storageDir, fileName);
      
      // Download to storage path first
      const response = await axios({
        method: 'get',
        url: download.url,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 300000 // 5 minutes
      });

      const writer = createWriteStream(storagePath);
      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const stats = await fs.stat(storagePath);
      if (stats.size > 0) {
        this.logger.info(`✅ Datei gespeichert in BMW-Ordner: ${storagePath} (${this.formatFileSize(stats.size)})`);
        
        // Also copy to target path if different
        if (targetPath !== storagePath) {
          const targetDir = path.dirname(targetPath);
          await fs.ensureDir(targetDir);
          await fs.copy(storagePath, targetPath);
          this.logger.info(`📁 Zusätzlich kopiert nach: ${targetPath}`);
        }
        
        return true;
      } else {
        throw new Error('Downloaded file is empty');
      }
    } catch (error) {
      this.logger.error(`❌ Download fehlgeschlagen: ${error}`);
      
      try {
        await fs.unlink(targetPath);
      } catch (e) {
        // Ignore deletion errors
      }
      
      return false;
    }
  }

  async scanExistingFiles(): Promise<ProviderDownload[]> {
    this.logger.info('📂 Scanne existierende BMW-Dateien für initiale Registrierung...');
    
    const config = this.getBMWConfig();
    if (!await fs.pathExists(config.downloadPath)) {
      this.logger.warn(`BMW download path does not exist: ${config.downloadPath}`);
      return [];
    }

    const existingFiles: ProviderDownload[] = [];
    
    // Check BMW categories based on folder structure
    const bmwCategories = ['ista-p', 'ista-next'];
    
    for (const category of bmwCategories) {
      const categoryPath = path.join(config.downloadPath, category);
      
      if (await fs.pathExists(categoryPath)) {
        const categoryFiles = await this.scanBMWDirectoryForExisting(categoryPath, category);
        existingFiles.push(...categoryFiles);
      }
    }

    this.logger.info(`📊 ${existingFiles.length} existierende BMW-Dateien zur Registrierung gefunden`);
    return existingFiles;
  }

  private async scanBMWDirectoryForExisting(dirPath: string, category: string): Promise<ProviderDownload[]> {
    const files: ProviderDownload[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subDirFiles = await this.scanBMWDirectoryForExisting(fullPath, category);
          files.push(...subDirFiles);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          const config = this.getBMWConfig();
          const relativePath = path.relative(config.downloadPath, fullPath);
          
          const download: ProviderDownload = {
            title: entry.name,
            version: this.extractVersion(entry.name),
            url: fullPath, // Use full path as URL for existing files
            category,
            displayName: `BMW ${category.toUpperCase()} - ${entry.name}`,
            method: 'existing_file',
            fileSize: stats.size,
            metadata: {
              relativePath,
              lastModified: stats.mtime.toISOString(),
              syncMethod: 'existing',
              isExisting: true,
              bmwCategory: category
            }
          };
          
          files.push(download);
        }
      }
    } catch (error) {
      this.logger.error(`❌ Fehler beim Scannen von ${dirPath}: ${error}`);
    }
    
    return files;
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.isLoggedIn = false;
      this.logger.info('🔒 Browser geschlossen');
    }
    this.logger.info('🧹 BMW Provider bereinigt');
  }
}
