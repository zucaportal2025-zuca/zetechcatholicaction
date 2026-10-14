export const generateVideoThumbnail = (videoFile) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.addEventListener('loadedmetadata', () => {
      video.currentTime = Math.min(video.duration * 0.3, 5);
    });
    
    video.addEventListener('seeked', () => {
      canvas.width = 640;
      canvas.height = 360;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Play button overlay
      ctx.fillStyle = 'rgba(59,130,246,0.85)';
      ctx.beginPath();
      ctx.arc(canvas.width/2, canvas.height/2, 30, 0, Math.PI*2);
      ctx.fill();
      
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.moveTo(canvas.width/2 + 6, canvas.height/2 - 10);
      ctx.lineTo(canvas.width/2 + 6, canvas.height/2 + 10);
      ctx.lineTo(canvas.width/2 + 18, canvas.height/2);
      ctx.fill();
      
      resolve(canvas.toDataURL('image/jpeg', 0.85));
      video.remove();
      canvas.remove();
    });
    
    video.addEventListener('error', reject);
    video.src = URL.createObjectURL(videoFile);
  });
};