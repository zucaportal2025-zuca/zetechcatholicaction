import { useState, useRef, useEffect } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { motion, AnimatePresence } from 'framer-motion';

function ProfileImageCropper({ imageFile, onCropComplete, onClose }) {
  const [crop, setCrop] = useState(null);
  const [completedCrop, setCompletedCrop] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const imgRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);

  // Create object URL when component mounts
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImgSrc(url);
      
      // Cleanup function to revoke object URL
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [imageFile]);

  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    imgRef.current = e.currentTarget;
    
    // Calculate initial crop - LARGER crop area (90% of the image)
    // This makes the crop circle much bigger
    let cropWidth = 90;
    let cropHeight = 90;
    
    // If the image is very tall or wide, adjust to maintain square
    if (width > height) {
      cropWidth = (height / width) * 90;
    } else if (height > width) {
      cropHeight = (width / height) * 90;
    }
    
    // Center the crop circle
    const x = (100 - cropWidth) / 2;
    const y = (100 - cropHeight) / 2;
    
    setCrop({
      unit: '%',
      width: cropWidth,
      height: cropHeight,
      x: x,
      y: y
    });
  };

  const getCroppedImg = () => {
    return new Promise((resolve, reject) => {
      if (!completedCrop || !imgRef.current) {
        reject(new Error('No crop selected'));
        return;
      }

      const image = imgRef.current;
      const canvas = document.createElement('canvas');
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      
      // Calculate crop dimensions in pixels
      let cropX, cropY, cropWidth, cropHeight;
      
      if (completedCrop.unit === '%') {
        cropX = (completedCrop.x / 100) * image.width * scaleX;
        cropY = (completedCrop.y / 100) * image.height * scaleY;
        cropWidth = (completedCrop.width / 100) * image.width * scaleX;
        cropHeight = (completedCrop.height / 100) * image.height * scaleY;
      } else {
        cropX = completedCrop.x * scaleX;
        cropY = completedCrop.y * scaleY;
        cropWidth = completedCrop.width * scaleX;
        cropHeight = completedCrop.height * scaleY;
      }
      
      // Set canvas size to 500x500 for high quality profile picture
      const targetSize = 500;
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');

      // Draw and scale the cropped image to fit the canvas
      ctx.drawImage(
        image,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        targetSize,
        targetSize
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        const croppedFile = new File([blob], 'profile-cropped.jpg', { type: 'image/jpeg' });
        resolve(croppedFile);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleCropComplete = async () => {
    setIsLoading(true);
    try {
      const croppedFile = await getCroppedImg();
      onCropComplete(croppedFile);
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="cropper-overlay"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="cropper-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="cropper-header">
            <h3>Crop Profile Picture</h3>
            <button className="cropper-close" onClick={onClose}>✕</button>
          </div>
          
          <div className="cropper-content">
            {imgSrc && (
              <ReactCrop
                crop={crop}
                onChange={(newCrop) => setCrop(newCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
                ruleOfThirds
                keepSelection={true}
                minWidth={30}
                minHeight={30}
              >
                <img
                  src={imgSrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '60vh',
                    display: 'block',
                    margin: '0 auto'
                  }}
                />
              </ReactCrop>
            )}
          </div>

          <div className="cropper-footer">
            <button className="cropper-cancel" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="cropper-save" 
              onClick={handleCropComplete}
              disabled={isLoading || !completedCrop}
            >
              {isLoading ? 'Processing...' : 'Save & Upload'}
            </button>
          </div>

          <style jsx>{`
            .cropper-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.85);
              backdrop-filter: blur(8px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 1000;
            }

            .cropper-modal {
              background: white;
              border-radius: 28px;
              width: 90%;
              max-width: 800px;
              max-height: 90vh;
              overflow: hidden;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            }

            .cropper-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px 28px;
              border-bottom: 1px solid #e5e7eb;
              background: white;
            }

            .cropper-header h3 {
              font-size: 22px;
              font-weight: 600;
              color: #1f2937;
              margin: 0;
            }

            .cropper-close {
              background: none;
              border: none;
              font-size: 28px;
              cursor: pointer;
              color: #6b7280;
              transition: color 0.2s;
              width: 36px;
              height: 36px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
            }

            .cropper-close:hover {
              background: #f3f4f6;
              color: #1f2937;
            }

            .cropper-content {
              padding: 28px;
              display: flex;
              justify-content: center;
              align-items: center;
              background: #f9fafb;
              min-height: 400px;
            }

            .cropper-footer {
              padding: 20px 28px;
              display: flex;
              justify-content: flex-end;
              gap: 12px;
              border-top: 1px solid #e5e7eb;
              background: white;
            }

            .cropper-cancel, .cropper-save {
              padding: 12px 28px;
              border-radius: 12px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              border: none;
            }

            .cropper-cancel {
              background: #f3f4f6;
              color: #6b7280;
            }

            .cropper-cancel:hover {
              background: #e5e7eb;
              transform: translateY(-1px);
            }

            .cropper-save {
              background: linear-gradient(135deg, #667eea, #764ba2);
              color: white;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .cropper-save:hover:not(:disabled) {
              transform: translateY(-2px);
              box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
            }

            .cropper-save:disabled {
              opacity: 0.6;
              cursor: not-allowed;
              transform: none;
            }

            /* Style the crop selection area */
            :global(.ReactCrop__crop-selection) {
              border: 3px solid #667eea !important;
              box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6) !important;
              border-radius: 50% !important;
            }

            :global(.ReactCrop__drag-handle) {
              background: #667eea !important;
              width: 10px !important;
              height: 10px !important;
              border: 2px solid white !important;
            }

            :global(.ReactCrop__drag-handle:after) {
              background: #667eea !important;
            }

            :global(.ReactCrop__crop-selection:hover) {
              border-color: #764ba2 !important;
            }

            @media (max-width: 768px) {
              .cropper-modal {
                width: 95%;
                max-width: 95%;
              }
              
              .cropper-header h3 {
                font-size: 18px;
              }
              
              .cropper-content {
                padding: 16px;
                min-height: 300px;
              }
              
              .cropper-cancel, .cropper-save {
                padding: 10px 20px;
              }
            }
          `}</style>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ProfileImageCropper;