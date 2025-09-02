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
    await this.launchBrowser();
    this.updateStatus(ProviderStatus.ACTIVE);
  }

  private async launchBrowser(): Promise<void> {
    this.logger.info('🌐 Starte Browser...');
    
    const config = this.getBMWConfig();
    
    this.browser = await chromium.launch({
      headless: config.headless,
      args: ['--disable-blink-features=AutomationControlled']
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
      return this.isLoggedIn;
    }

    this.logger.info('🔐 Logge bei BMW ein...');
    
    try {
      const config = this.getBMWConfig();
      
      await this.page.goto(config.authUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await this.page.waitForSelector('input[name="j_username"], input[type="text"]', { 
        timeout: 10000 
      });

      await this.page.fill('input[name="j_username"], input[type="text"]', config.username);
      await this.page.fill('input[name="j_password"], input[type="password"]', config.password);

      await this.page.click('button[type="submit"], input[type="submit"]');

      try {
        await this.page.waitForURL('**/startpage-workshop**', { timeout: 30000 });
      } catch (error) {
        await this.page.waitForURL('https://aos.bmwgroup.com/**', { timeout: 30000 });
      }

      await this.page.waitForLoadState('networkidle');

      const currentUrl = this.page.url();
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

      await this.page.goto(appUrl, {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      await this.page.waitForLoadState('domcontentloaded');
      await this.delay(3000);

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

    this.logger.debug('Warte auf Frames...');
    
    try {
      await this.page.waitForFunction(() => {
        const frames = document.querySelectorAll('iframe');
        return frames.length > 0;
      }, { timeout: 10000 });
    } catch (e) {
      this.logger.debug('Keine Frames gefunden, suche in Hauptseite');
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

      const writer = createWriteStream(targetPath);
      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const stats = await fs.stat(targetPath);
      if (stats.size > 0) {
        this.logger.info(`✅ Download abgeschlossen: ${path.basename(targetPath)} (${this.formatFileSize(stats.size)})`);
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

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.isLoggedIn = false;
      this.logger.info('🔒 Browser geschlossen');
    }
  }
}
