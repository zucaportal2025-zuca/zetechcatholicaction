class BadgeManager {
  constructor() {
    this.count = 0;
  }

  async update(count) {
    this.count = Math.max(0, count);
    localStorage.setItem('zuca_badge', this.count);
    
    // Update app badge
    if (navigator.setAppBadge) {
      try {
        if (this.count > 0) {
          await navigator.setAppBadge(this.count);
        } else {
          await navigator.clearAppBadge();
        }
        console.log(`📱 Badge: ${this.count}`);
      } catch (e) {
        // Silent fail
      }
    }
    
    // Notify SW
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_BADGE',
        count: this.count
      });
    }
    
    return this.count;
  }

  increment() {
    return this.update(this.count + 1);
  }

  decrement() {
    return this.update(Math.max(0, this.count - 1));
  }

  load() {
    const saved = localStorage.getItem('zuca_badge');
    this.count = saved ? parseInt(saved) : 0;
    return this.count;
  }

  // Alias methods for App.jsx compatibility
  updateBadgeCount(count) {
    return this.update(count);
  }

  loadCount() {
    return this.load();
  }

  incrementBadge() {
    return this.increment();
  }
}

export default new BadgeManager();