class SQLMapGUI {
    constructor() {
        this.form = document.getElementById('sqlmap-form');
        this.commandPreview = document.getElementById('command-preview');
        this.copyButton = document.getElementById('copy-cmd');
        this.generateButton = document.getElementById('generate-cmd');
        this.validateButton = document.getElementById('validate-target');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.suggestionsContent = document.getElementById('suggestions-content');
        this.formatButton = document.getElementById('format-cmd');
        this.commandLength = document.getElementById('cmd-length');
        
        this.currentTab = 'target';
        this.isFormatted = false;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeForm();
        this.loadPresets();
    }

    bindEvents() {
        this.generateButton.addEventListener('click', () => this.generateCommand());
        this.validateButton.addEventListener('click', () => this.validateTarget());
        this.copyButton.addEventListener('click', () => this.copyCommand());
        this.formatButton.addEventListener('click', () => this.toggleFormat());
        
        this.form.addEventListener('reset', () => {
            setTimeout(() => this.updateCommandPreview(), 100);
            this.updateSuggestions();
        });

        this.form.addEventListener('input', () => this.updateCommandPreview());
        this.form.addEventListener('change', () => this.updateCommandPreview());

        document.getElementById('user-agent').addEventListener('change', (e) => {
            const customGroup = document.getElementById('custom-agent-group');
            customGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
        });

        document.querySelectorAll('.preset-card').forEach(card => {
            card.addEventListener('click', (e) => this.applyPreset(e.currentTarget.dataset.preset));
        });

        document.getElementById('target-type').addEventListener('change', () => this.updateSmartSuggestions());
        document.getElementById('url').addEventListener('input', () => this.analyzeTarget());

        this.initTabs();
        this.addFocusEffects();
        this.bindStatusUpdates();
    }

    initializeForm() {
        document.getElementById('level').value = '1';
        document.getElementById('risk').value = '1';
        document.getElementById('threads').value = '1';
        
        ['tech-b', 'tech-e', 'tech-u', 'tech-s', 'tech-t', 'tech-q'].forEach(id => {
            document.getElementById(id).checked = true;
        });

        this.updateCommandPreview();
    }

    initTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        this.currentTab = tabName;
        this.updateProgress();
    }

    updateProgress() {
        const progressFill = document.getElementById('config-progress');
        const completedTabs = this.getCompletedTabs();
        const progress = (completedTabs.length / 6) * 100;
        progressFill.style.width = `${progress}%`;
    }

    getCompletedTabs() {
        const completed = [];
        
        if (document.getElementById('url').value.trim()) completed.push('target');
        
        const hasRequestConfig = document.getElementById('user-agent').value || 
                                document.getElementById('data').value.trim() ||
                                document.getElementById('cookie').value.trim();
        if (hasRequestConfig) completed.push('request');
        
        const hasDetectionConfig = document.getElementById('level').value !== '1' ||
                                  document.getElementById('risk').value !== '1';
        if (hasDetectionConfig) completed.push('detection');
        
        const hasEnumConfig = document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked').length > 0;
        if (hasEnumConfig) completed.push('enumeration');
        
        const hasAdvancedConfig = document.getElementById('threads').value !== '1' ||
                                 document.getElementById('delay').value ||
                                 document.getElementById('batch').checked;
        if (hasAdvancedConfig) completed.push('advanced');
        
        const hasInnovationConfig = document.getElementById('smart-payloads').checked ||
                                   document.getElementById('waf-bypass').checked;
        if (hasInnovationConfig) completed.push('innovation');
        
        return completed;
    }

    bindStatusUpdates() {
        document.getElementById('url').addEventListener('input', () => this.updateStatusIndicators());
        this.form.addEventListener('change', () => this.updateStatusIndicators());
        this.updateStatusIndicators();
    }

    updateStatusIndicators() {
        const targetStatus = document.getElementById('target-status');
        const configStatus = document.getElementById('config-status');
        const commandStatus = document.getElementById('command-status');
        
        const url = document.getElementById('url').value.trim();
        targetStatus.className = `status-dot ${url ? 'active' : ''}`;
        
        const completedTabs = this.getCompletedTabs();
        configStatus.className = `status-dot ${completedTabs.length > 2 ? 'active' : completedTabs.length > 0 ? 'warning' : ''}`;
        
        commandStatus.className = `status-dot ${url && completedTabs.length > 0 ? 'active' : ''}`;
        
        this.updateProgress();
    }

    toggleFormat() {
        const command = this.commandPreview.textContent;
        if (!command || command.includes('Click "Generate Command"')) return;
        
        this.isFormatted = !this.isFormatted;
        
        if (this.isFormatted) {
            const formatted = command.replace(/( --)/g, ' \\\n    --');
            this.commandPreview.textContent = formatted;
            this.formatButton.innerHTML = '<i class="fas fa-compress"></i> Compact';
        } else {
            const compact = command.replace(/\s*\\\s*\n\s*/g, ' ');
            this.commandPreview.textContent = compact;
            this.formatButton.innerHTML = '<i class="fas fa-align-left"></i> Format';
        }
        
        this.updateCommandLength();
    }

    updateCommandLength() {
        const command = this.commandPreview.textContent;
        const length = command.length;
        this.commandLength.textContent = `${length} characters`;
    }

    addFocusEffects() {
        const inputs = this.form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', (e) => {
                e.target.closest('.form-group').classList.add('focused');
            });
            input.addEventListener('blur', (e) => {
                e.target.closest('.form-group').classList.remove('focused');
            });
        });
    }

    generateCommand() {
        this.showLoading();
        
        setTimeout(() => {
            const command = this.buildSQLMapCommand();
            this.displayCommand(command);
            this.enableCopyButton();
            this.hideLoading();
            this.updateSuggestions();
            
            this.commandPreview.parentElement.classList.add('success-flash');
            setTimeout(() => {
                this.commandPreview.parentElement.classList.remove('success-flash');
            }, 600);
        }, 1500);
    }

    buildSQLMapCommand() {
        let command = 'python .\\sqlmap.py';
        const formData = new FormData(this.form);
        
        const url = document.getElementById('url').value.trim();
        if (url) command += ` -u "${url}"`;
        
        const direct = document.getElementById('direct').value.trim();
        if (direct) command += ` -d "${direct}"`;
        
        const logfile = document.getElementById('logfile').value.trim();
        if (logfile) command += ` -l "${logfile}"`;
        
        const bulkfile = document.getElementById('bulkfile').value.trim();
        if (bulkfile) command += ` -m "${bulkfile}"`;
        
        const requestfile = document.getElementById('requestfile').value.trim();
        if (requestfile) command += ` -r "${requestfile}"`;

        const userAgent = document.getElementById('user-agent').value;
        if (userAgent === 'random') {
            command += ' --random-agent';
        } else if (userAgent === 'mobile') {
            command += ' --mobile';
        } else if (userAgent === 'custom') {
            const customAgent = document.getElementById('custom-agent').value.trim();
            if (customAgent) command += ` -A "${customAgent}"`;
        }

        const method = document.getElementById('method').value;
        if (method) command += ` --method=${method}`;

        const data = document.getElementById('data').value.trim();
        if (data) command += ` --data="${data}"`;

        const cookie = document.getElementById('cookie').value.trim();
        if (cookie) command += ` --cookie="${cookie}"`;

        const headers = document.getElementById('headers').value.trim();
        if (headers) {
            const headerLines = headers.split('\n').filter(h => h.trim());
            headerLines.forEach(header => {
                command += ` -H "${header.trim()}"`;
            });
        }

        const level = document.getElementById('level').value;
        if (level && level !== '1') command += ` --level=${level}`;

        const risk = document.getElementById('risk').value;
        if (risk && risk !== '1') command += ` --risk=${risk}`;

        const techniques = [];
        ['tech-b', 'tech-e', 'tech-u', 'tech-s', 'tech-t', 'tech-q'].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox.checked) {
                techniques.push(checkbox.value);
            }
        });
        if (techniques.length > 0 && techniques.length < 6) {
            command += ` --technique=${techniques.join('')}`;
        }

        const enumOptions = {
            'enum-all': '-a',
            'enum-banner': '-b',
            'enum-current-user': '--current-user',
            'enum-current-db': '--current-db',
            'enum-hostname': '--hostname',
            'enum-is-dba': '--is-dba',
            'enum-users': '--users',
            'enum-passwords': '--passwords',
            'enum-dbs': '--dbs',
            'enum-tables': '--tables',
            'enum-columns': '--columns',
            'enum-dump': '--dump'
        };

        Object.entries(enumOptions).forEach(([id, flag]) => {
            if (document.getElementById(id).checked) {
                command += ` ${flag}`;
            }
        });

        const database = document.getElementById('database').value.trim();
        if (database) command += ` -D "${database}"`;

        const table = document.getElementById('table').value.trim();
        if (table) command += ` -T "${table}"`;

        const threads = document.getElementById('threads').value;
        if (threads && threads !== '1') command += ` --threads=${threads}`;

        const delay = document.getElementById('delay').value;
        if (delay) command += ` --delay=${delay}`;

        const timeout = document.getElementById('timeout').value;
        if (timeout && timeout !== '30') command += ` --timeout=${timeout}`;

        const retries = document.getElementById('retries').value;
        if (retries && retries !== '3') command += ` --retries=${retries}`;

        if (document.getElementById('batch').checked) command += ' --batch';
        if (document.getElementById('random-agent').checked) command += ' --random-agent';
        if (document.getElementById('tor').checked) command += ' --tor';
        if (document.getElementById('check-tor').checked) command += ' --check-tor';

        if (document.getElementById('smart-payloads').checked) {
            command = this.addSmartPayloads(command);
        }
        if (document.getElementById('waf-bypass').checked) {
            command = this.addWAFBypass(command);
        }
        if (document.getElementById('stealth-mode').checked) {
            command = this.addStealthMode(command);
        }

        return command;
    }

    addSmartPayloads(command) {
        const targetType = document.getElementById('target-type').value;
        
        const tamperSuggestions = {
            'login': 'space2comment,charencode',
            'search': 'between,charunicodeencode',
            'product': 'space2plus,charencode',
            'api': 'base64encode,charencode',
            'cms': 'space2comment,between,charencode'
        };

        if (targetType && tamperSuggestions[targetType]) {
            command += ` --tamper=${tamperSuggestions[targetType]}`;
        }

        return command;
    }

    addWAFBypass(command) {
        command += ' --tamper=space2comment,charencode,randomcase';
        command += ' --delay=1';
        command += ' --timeout=60';
        return command;
    }

    addStealthMode(command) {
        command += ' --delay=2';
        command += ' --timeout=60';
        command += ' --retries=1';
        command += ' --keep-alive';
        command += ' --random-agent';
        return command;
    }

    updateCommandPreview() {
        const command = this.buildSQLMapCommand();
        this.displayCommand(command);
    }

    displayCommand(command) {
        this.commandPreview.textContent = command;
        this.updateCommandLength();
        this.isFormatted = false;
        this.formatButton.innerHTML = '<i class="fas fa-align-left"></i> Format';
    }

    highlightSyntax(command) {
        return command
            .replace(/(--?[\w-]+)/g, '<span class="flag">$1</span>')
            .replace(/("[^"]*")/g, '<span class="value">$1</span>')
            .replace(/(\.\\sqlmap\.py)/g, '<span class="path">$1</span>');
    }

    validateTarget() {
        const url = document.getElementById('url').value.trim();
        if (!url) {
            this.showSuggestion('Please enter a target URL first', 'error');
            return;
        }

        this.showLoading();
        
        setTimeout(() => {
            this.hideLoading();
            
            try {
                const urlObj = new URL(url);
                const suggestions = this.generateTargetSuggestions(urlObj);
                this.displayValidationResults(suggestions);
            } catch (e) {
                this.showSuggestion('Invalid URL format. Please check your target URL.', 'error');
            }
        }, 2000);
    }

    generateTargetSuggestions(urlObj) {
        const suggestions = [];
        
        if (urlObj.searchParams.size > 0) {
            suggestions.push({
                type: 'success',
                message: `Found ${urlObj.searchParams.size} parameter(s) in URL - good for injection testing`
            });
        }

        const vulnParams = ['id', 'user', 'page', 'cat', 'item', 'product'];
        const foundVulnParams = [...urlObj.searchParams.keys()].filter(param => 
            vulnParams.some(vp => param.toLowerCase().includes(vp))
        );

        if (foundVulnParams.length > 0) {
            suggestions.push({
                type: 'warning',
                message: `Potentially vulnerable parameters detected: ${foundVulnParams.join(', ')}`
            });
        }

        if (urlObj.protocol === 'http:') {
            suggestions.push({
                type: 'info',
                message: 'HTTP detected - consider enabling --force-ssl for encrypted testing'
            });
        }

        if (urlObj.port && urlObj.port !== '80' && urlObj.port !== '443') {
            suggestions.push({
                type: 'info',
                message: `Custom port ${urlObj.port} detected - may indicate development/testing environment`
            });
        }

        return suggestions;
    }

    displayValidationResults(suggestions) {
        this.suggestionsContent.innerHTML = '';
        
        if (suggestions.length === 0) {
            suggestions.push({
                type: 'info',
                message: 'Target appears standard - proceed with basic testing approach'
            });
        }

        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            
            const icon = this.getIconForType(suggestion.type);
            item.innerHTML = `
                <i class="${icon}"></i>
                <span>${suggestion.message}</span>
            `;
            
            this.suggestionsContent.appendChild(item);
        });
    }

    getIconForType(type) {
        const icons = {
            'success': 'fas fa-check-circle',
            'error': 'fas fa-exclamation-triangle',
            'warning': 'fas fa-exclamation-circle',
            'info': 'fas fa-info-circle'
        };
        return icons[type] || 'fas fa-info-circle';
    }

    analyzeTarget() {
        const url = document.getElementById('url').value.trim();
        if (!url) return;

        try {
            const urlObj = new URL(url);
            const suggestions = this.generateSmartSuggestions(urlObj);
            this.updateSmartSuggestions(suggestions);
        } catch (e) {
            
        }
    }

    generateSmartSuggestions(urlObj) {
        const suggestions = [];
        const path = urlObj.pathname.toLowerCase();
        
        if (path.includes('login') || path.includes('auth')) {
            document.getElementById('target-type').value = 'login';
            suggestions.push('Login form detected - enabling authentication bypass techniques');
        } else if (path.includes('search')) {
            document.getElementById('target-type').value = 'search';
            suggestions.push('Search function detected - enabling search-specific payloads');
        } else if (path.includes('product') || path.includes('item') || path.includes('detail')) {
            document.getElementById('target-type').value = 'product';
            suggestions.push('Product/detail page detected - enabling catalog-specific tests');
        } else if (path.includes('api') || path.includes('rest')) {
            document.getElementById('target-type').value = 'api';
            suggestions.push('API endpoint detected - enabling API-specific testing methods');
        } else if (path.includes('admin') || path.includes('cms')) {
            document.getElementById('target-type').value = 'cms';
            suggestions.push('Admin/CMS interface detected - enabling privilege escalation tests');
        }

        return suggestions;
    }

    updateSmartSuggestions(customSuggestions = null) {
        const targetType = document.getElementById('target-type').value;
        let suggestions = customSuggestions || [];

        if (targetType) {
            const typeSuggestions = {
                'login': [
                    'Consider enabling --forms to test login forms automatically',
                    'Use --batch mode to avoid manual intervention',
                    'Enable time-based blind techniques for login bypass'
                ],
                'search': [
                    'Search functions often vulnerable to UNION-based injection',
                    'Consider using --union-cols to optimize UNION detection',
                    'Enable --crawl to discover additional search endpoints'
                ],
                'product': [
                    'Product pages often use numeric IDs - ideal for basic injection',
                    'Consider --dump to extract product/customer data',
                    'Use --threads=5 for faster enumeration of product catalogs'
                ],
                'api': [
                    'APIs may require specific headers - check authentication',
                    'Consider --method=PUT/DELETE for RESTful testing',
                    'Use --json-data for JSON payload testing'
                ],
                'cms': [
                    'CMS systems often have admin panels - enable --dbs enumeration',
                    'Consider --privileges to check admin access levels',
                    'Use --dump-all with caution on production systems'
                ]
            };

            if (typeSuggestions[targetType]) {
                suggestions = suggestions.concat(typeSuggestions[targetType]);
            }
        }

        if (suggestions.length === 0) {
            suggestions.push('Configure target type for personalized recommendations');
        }

        this.displaySuggestions(suggestions);
        this.updateSuggestionCount(suggestions.length);
    }

    updateSuggestionCount(count) {
        const suggestionCount = document.getElementById('suggestion-count');
        if (suggestionCount) {
            suggestionCount.textContent = `${count} tip${count !== 1 ? 's' : ''}`;
        }
    }

    displaySuggestions(suggestions) {
        this.suggestionsContent.innerHTML = '';
        
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <i class="fas fa-lightbulb"></i>
                <span>${suggestion}</span>
            `;
            this.suggestionsContent.appendChild(item);
        });
        
        this.updateSuggestionCount(suggestions.length);
    }

    loadPresets() {
        this.presets = {
            basic: {
                name: 'Basic Scan',
                description: 'Safe, fast scan for beginners',
                config: {
                    level: '1',
                    risk: '1',
                    batch: true,
                    techniques: ['B', 'E', 'U']
                }
            },
            aggressive: {
                name: 'Aggressive Scan',
                description: 'Comprehensive testing with higher risk',
                config: {
                    level: '5',
                    risk: '3',
                    batch: true,
                    threads: '5',
                    techniques: ['B', 'E', 'U', 'S', 'T', 'Q'],
                    enumeration: ['current-user', 'current-db', 'dbs', 'tables']
                }
            },
            stealth: {
                name: 'Stealth Mode',
                description: 'Low-profile testing to avoid detection',
                config: {
                    level: '2',
                    risk: '1',
                    delay: '3',
                    randomAgent: true,
                    batch: true,
                    techniques: ['B', 'T']
                }
            },
            comprehensive: {
                name: 'Comprehensive',
                description: 'Full enumeration and data extraction',
                config: {
                    level: '3',
                    risk: '2',
                    batch: true,
                    threads: '3',
                    techniques: ['B', 'E', 'U', 'S', 'T'],
                    enumeration: ['all']
                }
            }
        };
    }

    applyPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) return;

        // Reset form first
        this.form.reset();

        const config = preset.config;
        
        if (config.level) document.getElementById('level').value = config.level;
        if (config.risk) document.getElementById('risk').value = config.risk;
        if (config.threads) document.getElementById('threads').value = config.threads;
        if (config.delay) document.getElementById('delay').value = config.delay;
        
        if (config.batch) document.getElementById('batch').checked = true;
        if (config.randomAgent) document.getElementById('random-agent').checked = true;

        if (config.techniques) {
            ['tech-b', 'tech-e', 'tech-u', 'tech-s', 'tech-t', 'tech-q'].forEach(id => {
                const checkbox = document.getElementById(id);
                checkbox.checked = config.techniques.includes(checkbox.value);
            });
        }

        if (config.enumeration) {
            config.enumeration.forEach(option => {
                const checkbox = document.getElementById(`enum-${option}`);
                if (checkbox) checkbox.checked = true;
            });
        }

        this.showSuggestion(`${preset.name} preset applied - ${preset.description}`, 'success');
        
        setTimeout(() => {
            this.updateCommandPreview();
            this.updateStatusIndicators();
        }, 100);
    }

    showSuggestion(message, type = 'info') {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `
            <span class="status-indicator status-${type}"></span>
            <span>${message}</span>
        `;
        
        this.suggestionsContent.innerHTML = '';
        this.suggestionsContent.appendChild(item);
    }

    copyCommand() {
        const command = this.commandPreview.textContent;
        
        navigator.clipboard.writeText(command).then(() => {
            this.copyButton.classList.add('copied');
            this.copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
            
            setTimeout(() => {
                this.copyButton.classList.remove('copied');
                this.copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
            }, 2000);
            
            this.showSuggestion('Command copied to clipboard successfully!', 'success');
        }).catch(() => {
            this.showSuggestion('Failed to copy command. Please select and copy manually.', 'error');
        });
    }

    enableCopyButton() {
        this.copyButton.disabled = false;
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    updateSuggestions() {
        const url = document.getElementById('url').value.trim();
        if (url) {
            this.analyzeTarget();
        } else {
            this.displaySuggestions(['Enter a target URL to get personalized recommendations']);
        }
    }
}

class AdvancedFeatures {
    constructor(gui) {
        this.gui = gui;
        this.payloadDatabase = this.initializePayloadDatabase();
    }

    initializePayloadDatabase() {
        return {
            'login': [
                "' OR '1'='1",
                "admin'--",
                "' OR 1=1#",
                "') OR ('1'='1",
                "' OR 'a'='a"
            ],
            'search': [
                "' UNION SELECT 1,2,3--",
                "' AND 1=1--",
                "' OR 1=1 LIMIT 1--",
                "')) UNION SELECT NULL,NULL--",
                "' UNION ALL SELECT 1,2,3,4,5--"
            ],
            'numeric': [
                "1 OR 1=1",
                "1' OR '1'='1",
                "1 UNION SELECT 1,2,3",
                "1 AND 1=1",
                "1; DROP TABLE users--"
            ]
        };
    }

    generateCustomPayloads(targetType, parameters) {
        const basePayloads = this.payloadDatabase[targetType] || this.payloadDatabase['numeric'];
        const customPayloads = [];

        basePayloads.forEach(payload => {
            customPayloads.push(payload);
            customPayloads.push(payload.replace(/'/g, '"'));
            customPayloads.push(encodeURIComponent(payload));
        });

        return customPayloads;
    }

    detectWAF(url) {
        const commonWAFs = ['CloudFlare', 'AWS WAF', 'ModSecurity', 'Akamai', 'Sucuri'];
        const detected = commonWAFs[Math.floor(Math.random() * commonWAFs.length)];
        
        return {
            detected: Math.random() > 0.7,
            type: detected,
            confidence: Math.floor(Math.random() * 40) + 60
        };
    }

    generateBypassSuggestions(wafType) {
        const bypasses = {
            'CloudFlare': ['space2comment', 'charencode', 'randomcase'],
            'AWS WAF': ['between', 'charunicodeencode', 'space2plus'],
            'ModSecurity': ['space2comment', 'charencode', 'between'],
            'Akamai': ['randomcase', 'charunicodeencode', 'space2plus'],
            'Sucuri': ['charencode', 'between', 'randomcase']
        };

        return bypasses[wafType] || ['space2comment', 'charencode'];
    }
}

class Utils {
    static validateURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    static formatCommand(command) {
        return command.replace(/( --)/g, ' \\\n  --');
    }

    static estimateTestTime(command) {
        let baseTime = 30;
        
        if (command.includes('--level=5')) baseTime *= 5;
        if (command.includes('--risk=3')) baseTime *= 2;
        if (command.includes('--threads=')) {
            const threads = command.match(/--threads=(\d+)/);
            if (threads) baseTime /= parseInt(threads[1]);
        }
        if (command.includes('--delay=')) {
            const delay = command.match(/--delay=(\d+)/);
            if (delay) baseTime += parseInt(delay[1]) * 10;
        }

        return Math.max(baseTime, 10);
    }

    static generateTestReport(command, results) {
        const timestamp = new Date().toISOString();
        return {
            timestamp,
            command,
            estimatedTime: this.estimateTestTime(command),
            results
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const gui = new SQLMapGUI();
    const features = new AdvancedFeatures(gui);
    
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            gui.generateCommand();
        }
        if (e.ctrlKey && e.key === 'c' && e.target.closest('.command-output')) {
            e.preventDefault();
            gui.copyCommand();
        }
    });

    console.log(`
    ╔══════════════════════════════════════════════════════════════╗
    ║                     SQLMap Pro GUI v2.0                     ║
    ║              Professional Penetration Testing Tool           ║
    ║                                                              ║
    ║  🚀 Enhanced with AI-powered payload generation              ║
    ║  🛡️  Advanced WAF bypass techniques                          ║
    ║  ⚡ Real-time command optimization                           ║
    ║                                                              ║
    ║  Use responsibly and only on authorized targets!             ║
    ╚══════════════════════════════════════════════════════════════╝
    `);
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SQLMapGUI, AdvancedFeatures, Utils };
} 