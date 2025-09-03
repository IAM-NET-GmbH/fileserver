import { chromium, Browser, BrowserContext, Page } from 'playwright';
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
  private isCheckingForUpdates: boolean = false;
  
  // Global static lock to prevent multiple BMW Provider instances from running simultaneously
  private static globalUpdateLock: Promise<void> | null = null;

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
    this.logger.info('🚀 BMW Provider initializing...');
    
    const config = this.getBMWConfig();
    
    // Ensure download directory exists
    await fs.ensureDir(config.downloadPath);
    
    // Browser will only be started when checkForUpdates() is called
    this.updateStatus(ProviderStatus.ACTIVE);
    this.logger.info('✅ BMW Provider initialized (Browser will be started on demand)');
  }

  private async launchBrowser(): Promise<void> {
    // Check if browser is already running
    if (this.browser && !this.browser.isConnected()) {
      this.logger.warn('🔧 Browser connection lost, closing old browser...');
      try {
        await this.browser.close();
      } catch (e) {
        // Ignore errors when closing disconnected browser
      }
      this.browser = null;
      this.context = null;
      this.page = null;
      this.isLoggedIn = false;
    }
    
    if (this.browser) {
      this.logger.debug('🌐 Browser already running, using existing browser');
      return;
    }
    
    this.logger.info('🌐 Starting browser...');
    
    const config = this.getBMWConfig();
    
    // Auto-detect display availability for SSH environments
    const hasDisplay = process.env.DISPLAY !== undefined;
    const isSSH = process.env.SSH_CLIENT !== undefined || process.env.SSH_TTY !== undefined;
    
    let shouldUseHeadless = config.headless;
    
    // Auto-switch to headless if no display is available
    if (!config.headless && !hasDisplay && isSSH) {
      this.logger.warn('⚠️ No display available (SSH without X11). Switching to headless: true');
      this.logger.info('💡 Tip: Use "xvfb-run -a npm run dev:backend" for virtual display');
      shouldUseHeadless = true;
    }
    
    this.logger.info(`🖥️ Browser mode: ${shouldUseHeadless ? 'headless' : 'headed'} (Display: ${hasDisplay ? 'available' : 'not available'})`);
    
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
    
    this.logger.info('✅ Browser started successfully');
  }

  async checkForUpdates(): Promise<ProviderDownload[]> {
    // Global lock to prevent multiple BMW Provider checks from running simultaneously
    if (BMWProvider.globalUpdateLock) {
      this.logger.warn('⏳ BMW Provider update already in progress, waiting for completion...');
      await BMWProvider.globalUpdateLock;
      this.logger.info('✅ Previous BMW Provider update completed');
    }

    // Check if this instance is already running
    if (this.isCheckingForUpdates) {
      this.logger.warn('⚠️ This BMW Provider is already running an update check, skipping...');
      return [];
    }

    // Create new lock promise
    let resolveLock: () => void;
    BMWProvider.globalUpdateLock = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });

    this.isCheckingForUpdates = true;

    try {
      this.logger.info('🔍 Checking for BMW updates...');
      
      // Start browser if not already started
      if (!this.browser) {
        await this.launchBrowser();
      }
      
      if (!this.isLoggedIn) {
        const loginSuccess = await this.login();
        if (!loginSuccess) {
          throw new Error('BMW login failed');
        }
      }

      const allDownloads: ProviderDownload[] = [];

      // Check ISTA-P
      this.logger.info('📥 Checking ISTA-P downloads...');
      const istaPDownloads = await this.checkApplicationUpdates('ista-p');
      allDownloads.push(...istaPDownloads);

      // Wait between applications
      await this.delay(5000);

      // Check ISTA-Next
      this.logger.info('📥 Checking ISTA-Next downloads...');
      const istaNextDownloads = await this.checkApplicationUpdates('ista-next');
      allDownloads.push(...istaNextDownloads);

      this.updateLastCheck(new Date());
      return allDownloads;
    } finally {
      // Always clean up locks
      this.isCheckingForUpdates = false;
      BMWProvider.globalUpdateLock = null;
      resolveLock!();
      this.logger.debug('🔓 BMW Provider lock released');
    }
  }

  private async login(): Promise<boolean> {
    if (this.isLoggedIn) {
      this.logger.info('✅ Already logged in');
      return true;
    }

    if (!this.page) {
      this.logger.error('❌ Browser page not available');
      return false;
    }

    this.logger.info('🔐 Logging into BMW...');
    
    try {
      const config = this.getBMWConfig();
      
      // Navigate to auth page - based on test script timeouts
      await this.page.goto(config.authUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for login form
      await this.page.waitForSelector('input[name="j_username"], input[type="text"]', { 
        timeout: 10000 
      });

      // Fill credentials
      await this.page.fill('input[name="j_username"], input[type="text"]', config.username);
      await this.page.fill('input[name="j_password"], input[type="password"]', config.password);

      // Click login button
      await this.page.click('button[type="submit"], input[type="submit"]');

      // Wait for redirect with fallbacks like in test script
      try {
        await this.page.waitForURL('**/startpage-workshop**', { timeout: 30000 });
      } catch (error) {
        // Fallback: wait for any aos.bmwgroup.com page
        await this.page.waitForURL('https://aos.bmwgroup.com/**', { timeout: 30000 });
      }

      // Additional wait for page to fully load
      await this.page.waitForLoadState('networkidle');

      // Check if we're on the startpage-workshop (successful login)
      const currentUrl = this.page.url();
      if (currentUrl.includes('startpage-workshop') || currentUrl.includes('aos.bmwgroup.com')) {
        this.isLoggedIn = true;
        this.logger.info('✅ Login successful!');
        return true;
      } else {
        throw new Error(`Login verification failed - URL: ${currentUrl}`);
      }
    } catch (error) {
      this.logger.error(`❌ Login failed: ${error}`);
      this.updateStatus(ProviderStatus.ERROR);
      return false;
    }
  }

  private async checkApplicationUpdates(appType: 'ista-p' | 'ista-next'): Promise<ProviderDownload[]> {
    const config = this.getBMWConfig();
    const appUrl = appType === 'ista-p' ? config.istaPUrl : config.istaNextUrl;
    const appName = appType === 'ista-p' ? 'ISTA-P' : 'ISTA-Next';

    this.logger.info(`🧭 Navigating to ${appName}...`);

    try {
      if (!this.page) throw new Error('Browser page not available');

      // Navigate directly to the application - based on test script
      await this.page.goto(appUrl, {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      // Wait for the page to load
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(3000); // Wait based on test script timing

      const currentUrl = this.page.url();
      this.logger.info(`✅ Successfully navigated to ${appName}: ${currentUrl}`);

      const downloads = await this.findDownloads(appType);
      this.logger.info(`✅ ${downloads.length} downloads found for ${appName}`);

      return downloads;
    } catch (error) {
      this.logger.error(`❌ Error checking ${appName}: ${error}`);
      return [];
    }
  }

  private async findDownloads(appType: 'ista-p' | 'ista-next'): Promise<ProviderDownload[]> {
    if (!this.page) return [];

    const appName = appType === 'ista-p' ? 'ISTA-P' : 'ISTA-Next';
    this.logger.info(`🔍 Searching for downloads on the ${appName} page...`);

    try {
      // Wait for the page to be fully loaded
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(2000); // Wait for dynamic content to load

      // Wait for frames to load
      this.logger.debug('Waiting for frames...');
      try {
        await this.page.waitForFunction(() => {
          const frames = document.querySelectorAll('iframe');
          return frames.length > 0;
        }, { timeout: 10000 });
        this.logger.debug('Frames found');
      } catch (e) {
        this.logger.debug('No frames found, searching only in main page');
      }

    // Execute JavaScript to find all download links (including frames) - based on test script
    const downloadsResult = await this.page.evaluate(() => {
      const foundDownloads: any[] = [];
      const frameInfo = {
        totalFrames: 0,
        accessibleFrames: 0,
        totalLinks: 0,
        downloadLinks: 0
      };

      // Function to search for downloads in a document
      function searchForDownloads(doc: Document, frameInfoName: string = 'main') {
        // Find all links that might be downloads
        const links = doc.querySelectorAll('a[href]');
        links.forEach(link => {
          const href = (link as HTMLAnchorElement).href;
          const text = link.textContent?.trim() || '';

          // Skip PDF files completely
          if (href.toLowerCase().includes('.pdf') || text.toLowerCase().includes('.pdf')) {
            return;
          }

          // Check if this looks like a download link
          if (href && href.includes('/api/v2/downloads') && text) {
            foundDownloads.push({
              title: text,
              url: href,
              method: `link_search_${frameInfoName}`
            });
          }
        });

        // Also look for buttons that might trigger downloads
        const buttons = doc.querySelectorAll('button, [role="button"]');
        buttons.forEach(button => {
          const text = button.textContent?.trim() || '';
          const onclick = button.getAttribute('onclick');
          
          if (text && onclick && onclick.includes('download')) {
            foundDownloads.push({
              title: text,
              url: onclick,
              method: `button_search_${frameInfoName}`
            });
          }
        });
      }

      // Search in main document
      searchForDownloads(document, 'main');

      // Search in all frames
      const frames = document.querySelectorAll('iframe');
      frameInfo.totalFrames = frames.length;

      frames.forEach((frame, index) => {
        try {
          const frameDoc = (frame as HTMLIFrameElement).contentDocument || 
                          (frame as HTMLIFrameElement).contentWindow?.document;
          if (frameDoc) {
            frameInfo.accessibleFrames++;
            searchForDownloads(frameDoc, `frame_${index}`);
          }
        } catch (e) {
          // Frame might be cross-origin and inaccessible
          // Skip this frame
        }
      });

      return {
        downloads: foundDownloads,
        frameInfo
      };
    });

    // Log frame information like in test script
    this.logger.debug(`Frame analysis: ${downloadsResult.frameInfo.totalFrames} frames found, ${downloadsResult.frameInfo.accessibleFrames} accessible`);

    const downloadsData = downloadsResult.downloads;
    this.logger.debug(`Found downloads (raw): ${downloadsData.length}`);
    
    // Debug output like in test script
    downloadsData.forEach((download, index) => {
      this.logger.debug(`  ${index + 1}. ${download.title}: ${download.url} [${download.method}]`);
    });

    const downloads: ProviderDownload[] = [];
    const categories = this.downloadCategories[appType];

    for (const rawDownload of downloadsData) {
      const category = this.categorizeDownload(rawDownload.title, Object.keys(categories));
      const version = this.extractVersion(rawDownload.title);

      if (category) {
        const download: ProviderDownload = {
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
        };
        
        downloads.push(download);
        this.logger.debug(`✅ Categorized: ${rawDownload.title} -> ${category} (${version})`);
      } else {
        this.logger.debug(`❌ Not categorized: ${rawDownload.title}`);
      }
    }

    return downloads;
    } catch (error) {
      this.logger.error(`❌ Error searching for downloads: ${error}`);
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
    this.logger.info(`📥 Downloading: ${download.displayName}`);
    this.logger.debug(`   URL: ${download.url}`);

    if (!this.context) {
      this.logger.error('❌ Browser context not available for download');
      return false;
    }

    const config = this.getBMWConfig();
    
    // Extract clean filename first (based on GitHub script)
    let fileName = this.extractCleanFilename(download.url);
    this.logger.debug(`   Extracted filename: ${fileName}`);
    
    if (!fileName || fileName === 'download' || fileName.length < 5) {
      const version = download.version !== 'unknown' ? `_${download.version}` : '';
      const extension = this.getFileExtension(download.url);
      fileName = `${download.category}${version}${extension}`;
      this.logger.debug(`   Generated fallback filename: ${fileName}`);
    }
    
    // Always use BMW provider's configured download path, ignore targetPath from ProviderService
    // Use appType (ista-p, ista-next) instead of category for directory structure
    const appType = download.metadata?.appType || 'unknown';
    const storageDir = path.join(config.downloadPath, appType);
    await fs.ensureDir(storageDir);
    
    const finalPath = path.join(storageDir, fileName);
    
    try {
      
      // Use axios for direct download (like in GitHub script) - more reliable
      this.logger.debug(`   Starting download with axios...`);
      
      // Dynamic import of axios
      const axios = (await import('axios')).default;
      
      // Get cookies from the browser context
      const cookies = await this.context.cookies();
      const cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
      
      this.logger.debug(`   Extracted cookies: ${cookies.length} cookies`);
      
      // Download with axios
      const response = await axios({
        method: 'GET',
        url: download.url,
        responseType: 'stream',
        headers: {
          'Cookie': cookieHeader,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/octet-stream,application/zip,application/x-msdownload,*/*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 300000 // 5 minutes
      });
      
      this.logger.debug(`   HTTP Response received: ${response.status} ${response.statusText}`);
      
      // Create write stream
      const writer = createWriteStream(finalPath);
      response.data.pipe(writer);
      
      // Wait for download to complete
      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      
      this.logger.debug(`   Download stream completed`);
      
      // Verify file
      const stats = await fs.stat(finalPath);
      if (stats.size > 0) {
        this.logger.info(`✅ Download completed: ${fileName} (${this.formatFileSize(stats.size)})`);
        this.logger.info(`📁 Saved to: ${finalPath}`);
        
        // BMW provider keeps files in its own structure, ProviderService will find them
        
        return true;
      } else {
        throw new Error('Downloaded file is empty');
      }
    } catch (error) {
      this.logger.error(`❌ Download failed: ${error}`);
      
      // Try to delete partial file
      try {
        await fs.unlink(finalPath);
      } catch (e) {
        // Ignore deletion errors
      }
      
      return false;
    }
  }

  private getFileExtension(url: string): string {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('.exe')) return '.exe';
    if (urlLower.includes('.zip')) return '.zip';
    if (urlLower.includes('.istapdata')) return '.istapdata';
    return '.bin'; // Default extension
  }

  private extractCleanFilename(url: string): string | null {
    try {
      // Check if this is a BMW redirect URL or direct AWS URL
      let finalUrl = url;
      
      // If it's a BMW URL, we need to follow the redirect to get the actual filename
      if (url.includes('aos.bmwgroup.com/api/v2/downloads')) {
        // Extract the key parameter which contains the actual filename
        const keyMatch = url.match(/[?&]key=([^&]+)/);
        if (keyMatch) {
          const key = decodeURIComponent(keyMatch[1]);
          // Extract filename from the key (last part after /)
          const keyParts = key.split('/');
          let filename = keyParts[keyParts.length - 1];
          
          this.logger.debug(`   BMW URL detected, extracted key: ${key}`);
          this.logger.debug(`   Filename from key: ${filename}`);
          
          // Remove any query parameters from the filename
          if (filename.includes('?')) {
            filename = filename.split('?')[0];
          }
          
          // Remove URL encoding
          filename = decodeURIComponent(filename);
          
          // Additional cleanup: remove any remaining query parameters or unwanted suffixes
          if (filename.includes('&signed=true')) {
            filename = filename.replace('&signed=true', '');
            this.logger.debug(`   After removing &signed=true: ${filename}`);
          }
          
          // Validate filename
          if (filename && filename.length > 0 && filename !== 'download') {
            this.logger.debug(`   Final clean filename from BMW key: ${filename}`);
            return filename;
          }
        }
      } else if (url.includes('amazonaws.com')) {
        // Direct AWS URL - extract filename from path
        const urlParts = url.split('/');
        let filename = urlParts[urlParts.length - 1];
        
        this.logger.debug(`   AWS URL detected, original filename: ${filename}`);
        
        // Remove query parameters (everything after ?)
        if (filename.includes('?')) {
          filename = filename.split('?')[0];
          this.logger.debug(`   After removing query params: ${filename}`);
        }
        
        // Remove URL encoding
        filename = decodeURIComponent(filename);
        this.logger.debug(`   After URL decoding: ${filename}`);
        
        // Validate filename
        if (filename && filename.length > 0 && filename !== 'download') {
          this.logger.debug(`   Final clean filename from AWS: ${filename}`);
          return filename;
        }
      } else {
        // Fallback for other URLs
        const urlParts = url.split('/');
        let filename = urlParts[urlParts.length - 1];
        
        this.logger.debug(`   Other URL type, original filename: ${filename}`);
        
        // Remove query parameters (everything after ?)
        if (filename.includes('?')) {
          filename = filename.split('?')[0];
          this.logger.debug(`   After removing query params: ${filename}`);
        }
        
        // Remove URL encoding
        filename = decodeURIComponent(filename);
        this.logger.debug(`   After URL decoding: ${filename}`);
        
        // Additional cleanup: remove any remaining query parameters or unwanted suffixes
        if (filename.includes('&signed=true')) {
          filename = filename.replace('&signed=true', '');
          this.logger.debug(`   After removing &signed=true: ${filename}`);
        }
        
        // Validate filename
        if (filename && filename.length > 0 && filename !== 'download') {
          this.logger.debug(`   Final clean filename: ${filename}`);
          return filename;
        }
      }
      
      this.logger.debug(`   Invalid filename, returning null`);
      return null;
    } catch (error) {
      this.logger.debug(`Error extracting filename: ${error}`);
      return null;
    }
  }



  async scanExistingFiles(): Promise<ProviderDownload[]> {
    this.logger.info('📂 Scanning existing BMW files for initial registration...');
    
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

    this.logger.info(`📊 ${existingFiles.length} existing BMW files found for registration`);
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
      this.logger.error(`❌ Error scanning ${dirPath}: ${error}`);
    }
    
    return files;
  }

  async cleanup(): Promise<void> {
    // Force cleanup of locks if this instance is being cleaned up
    if (this.isCheckingForUpdates) {
      this.logger.warn('🔧 Cleanup during running update check, resetting locks...');
      this.isCheckingForUpdates = false;
      // Note: globalUpdateLock will be cleaned by the try/finally block in checkForUpdates
    }

    if (this.browser) {
      try {
        if (this.browser.isConnected()) {
          await this.browser.close();
        }
      } catch (error) {
        this.logger.warn(`⚠️ Fehler beim Schließen des Browsers: ${error}`);
      }
      this.browser = null;
      this.context = null;
      this.page = null;
      this.isLoggedIn = false;
      this.logger.info('🔒 Browser closed');
    }
    this.logger.info('🧹 BMW Provider cleaned up');
  }
}
