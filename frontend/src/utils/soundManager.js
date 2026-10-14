// src/utils/soundManager.js
class SoundManager {
  constructor() {
    this.enabled = true;
    this.audioContext = null;
    this.isReady = false;
  }

  async init() {
    if (window.AudioContext || window.webkitAudioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    this.loadPreference();
    this.setupUserInteraction();
    console.log('🔊 Sound manager ready');
  }

  setupUserInteraction() {
    const enableAudio = () => {
      if (!this.isReady) {
        this.isReady = true;
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
        console.log('🔊 Audio enabled');
        document.removeEventListener('click', enableAudio);
        document.removeEventListener('touchstart', enableAudio);
      }
    };
    document.addEventListener('click', enableAudio);
    document.addEventListener('touchstart', enableAudio);
  }

  playNotificationSound() {
    if (!this.enabled) return;
    if (!this.isReady) {
      console.log('🔇 Click anywhere first');
      return;
    }
    
    console.log('🔊 Playing custom sound...');
    
    // Create a FRESH audio element each time
    const sound = new Audio('/notif.mp3');
    sound.volume = 0.7;
    
    sound.play().then(() => {
      console.log('✅ Your custom sound played!');
    }).catch(err => {
      console.log('Custom sound failed:', err.message);
      this.playFallbackBeep();
    });
  }

  playFallbackBeep() {
    try {
      if (!this.audioContext) return;
      
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.00001, this.audioContext.currentTime + 0.3);
      oscillator.stop(this.audioContext.currentTime + 0.3);
      
      console.log('🔊 Beep played via Web Audio');
    } catch (err) {
      console.log('Web Audio failed:', err);
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem('notification_sound_enabled', enabled);
  }

  loadPreference() {
    const saved = localStorage.getItem('notification_sound_enabled');
    this.enabled = saved !== null ? saved === 'true' : true;
    return this.enabled;
  }
}

export default new SoundManager();