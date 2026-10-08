import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:'media.spec.js',use:{baseURL:'http://localhost:5178',headless:true},webServer:{cwd:process.cwd(),command:'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5178 --strictPort',url:'http://localhost:5178',reuseExistingServer:true}});
