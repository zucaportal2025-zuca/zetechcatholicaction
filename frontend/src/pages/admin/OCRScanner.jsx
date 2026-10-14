// frontend/src/pages/admin/OCRScannerPage.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import axios from "axios";
import { 
  FiCamera, FiUpload, FiCopy, FiSave, 
  FiX, FiLoader, FiImage, FiRefreshCw,
  FiArrowLeft, FiCheck, FiAlertCircle,
  FiAlignLeft, FiBold, FiList, FiTrash2,
  FiRotateCw, FiMessageSquare, FiSend, FiMusic
} from "react-icons/fi";
import { MdOutlineAutoAwesome } from "react-icons/md";
import BASE_URL from "../../api";

export default function OCRScannerPage() {
  const navigate = useNavigate();
  
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [step, setStep] = useState("upload");
  const [processingStatus, setProcessingStatus] = useState("");
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState("scan");
  const [cameraActive, setCameraActive] = useState(false);
  
  // Camera refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Crop refs
  const imgRef = useRef(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([{
        id: Date.now(),
        role: "assistant",
        content: `👋 **Welcome to OCR Lyrics Scanner!**

**How to use:**
1. 📸 Take a photo or 📁 Upload an image
2. ✂️ Crop to select lyrics area
3. 🔍 Click "Extract Lyrics"
4. ✏️ Edit and format the text
5. 💾 Save to hymn book

**Tips:** Good lighting + steady camera = better results!`,
        timestamp: new Date()
      }]);
    }
  }, []);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => setNotification(null), 3000);
  };

  const stopCameraTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const startCamera = async () => {
    try {
      stopCameraTracks();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current.play();
      }
      setCameraActive(true);
      setStep("camera");
      showNotification("Camera ready!", "success");
    } catch (err) {
      showNotification(`Camera error: ${err.message}`, "error");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && cameraActive) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], "captured-photo.jpg", { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        setImage(file);
        setImagePreview(url);
        stopCameraTracks();
        setStep("crop");
        showNotification("Photo captured! Crop to select lyrics area.", "success");
      }, "image/jpeg", 0.95);
    }
  };

  const stopCamera = () => {
    stopCameraTracks();
    setStep("upload");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        setStep("crop");
        showNotification("Image uploaded! Crop to select lyrics area.", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRotate = () => {
    if (!imagePreview) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.height;
      canvas.height = img.width;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(90 * Math.PI / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      canvas.toBlob((blob) => {
        const rotatedFile = new File([blob], "rotated-image.jpg", { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        setImage(rotatedFile);
        setImagePreview(url);
        showNotification("Image rotated!", "success");
      }, "image/jpeg", 0.95);
    };
    img.src = imagePreview;
  };

  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop({ unit: "%", width: 90, height: 90 }, 1, width, height),
      width,
      height
    );
    setCrop(crop);
  };

  const getCroppedImg = async () => {
    if (!completedCrop || !imgRef.current) return null;
    
    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext("2d");
    
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
    });
  };

  const applyCrop = async () => {
    if (!completedCrop) {
      setStep("process");
      return;
    }
    
    showNotification("Applying crop...", "info");
    try {
      const croppedBlob = await getCroppedImg();
      if (croppedBlob) {
        const croppedFile = new File([croppedBlob], "cropped-image.jpg", { type: "image/jpeg" });
        setImage(croppedFile);
        const url = URL.createObjectURL(croppedBlob);
        setImagePreview(url);
        setStep("process");
        showNotification("Crop applied! Ready to extract lyrics.", "success");
      }
    } catch (err) {
      setStep("process");
      showNotification("Crop failed, continuing with original.", "warning");
    }
  };

  const skipCrop = () => {
    setStep("process");
    showNotification("Skipping crop. Processing original image.", "info");
  };

  const processOCR = async () => {
    if (!image) {
      showNotification("No image to process", "error");
      return;
    }
    
    setProcessing(true);
    setProcessingStatus("Sending to OCR.space...");
    
    try {
      const formData = new FormData();
      formData.append('image', image);
      
      const token = localStorage.getItem("token");
      
      const response = await axios.post(`${BASE_URL}/api/ocr/ocr-space`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        timeout: 30000
      });
      
      if (response.data.success) {
        let text = response.data.text;
        const conf = response.data.confidence;
        
        setEditedText(text);
        setConfidence(conf);
        setStep("edit");
        
        if (text && text.length > 0) {
          showNotification(`✅ Text extracted! Confidence: ${conf}%`, "success");
        } else {
          showNotification("No text detected. Try a clearer image.", "warning");
        }
      } else {
        throw new Error(response.data.error || "OCR failed");
      }
      
    } catch (err) {
      console.error("OCR Error:", err);
      showNotification(`OCR failed: ${err.response?.data?.error || err.message}`, "error");
    } finally {
      setProcessing(false);
      setProcessingStatus("");
    }
  };

  // Text formatting functions
  const formatLyrics = () => {
    let formatted = editedText;
    formatted = formatted.replace(/[ \t]+/g, " ");
    
    const lines = formatted.split("\n");
    const lineFrequency = new Map();
    
    lines.forEach(line => {
      const normalized = line.toLowerCase().trim();
      if (normalized.length > 5) {
        lineFrequency.set(normalized, (lineFrequency.get(normalized) || 0) + 1);
      }
    });
    
    const formattedLines = lines.map(line => {
      const normalized = line.toLowerCase().trim();
      if (lineFrequency.get(normalized) >= 3 && !line.includes("**")) {
        return `**${line}**`;
      }
      return line;
    });
    
    setEditedText(formattedLines.join("\n"));
    showNotification("🎵 Lyrics formatted! Repeated lines bolded.", "success");
  };

  const cleanFormatting = () => {
    const cleaned = editedText
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+/g, " ")
      .trim();
    setEditedText(cleaned);
    showNotification("✨ Formatting cleaned!", "success");
  };

  const capitalizeLines = () => {
    const capitalized = editedText.split("\n").map(line => {
      if (line.trim()) {
        return line.split(" ").map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(" ");
      }
      return line;
    }).join("\n");
    setEditedText(capitalized);
    showNotification("📝 All lines capitalized!", "success");
  };

  const addVerseNumbers = () => {
    const lines = editedText.split("\n");
    let verseNum = 1;
    let result = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      if (trimmedLine === "") {
        result.push("");
        continue;
      }
      
      const isNewVerse = (i === 0) || (lines[i-1]?.trim() === "");
      
      if (isNewVerse) {
        result.push(`${verseNum}. ${line}`);
        verseNum++;
      } else {
        result.push(`   ${line}`);
      }
    }
    
    setEditedText(result.join("\n"));
    showNotification(`🔢 Verse numbers added! Total: ${verseNum - 1} verses`, "success");
  };

  const removeVerseNumbers = () => {
    const cleaned = editedText.replace(/^\d+\.\s*/gm, "").replace(/^\s{3,}/gm, "");
    setEditedText(cleaned);
    showNotification("❌ Verse numbers removed!", "success");
  };

  const fixCommonErrors = () => {
    let fixed = editedText;
    const corrections = {
      "0": "O", "1": "I", "5": "S", "8": "B",
      "rn": "m", "cl": "d", "vv": "w",
    };
    for (const [wrong, correct] of Object.entries(corrections)) {
      fixed = fixed.replace(new RegExp(wrong, "g"), correct);
    }
    setEditedText(fixed);
    showNotification("🔧 Common OCR errors fixed!", "success");
  };

  const removeDuplicates = () => {
    const lines = editedText.split("\n");
    const seen = new Set();
    const unique = [];
    
    for (const line of lines) {
      const normalized = line.toLowerCase().trim();
      if (normalized === "") {
        unique.push(line);
      } else if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(line);
      }
    }
    
    setEditedText(unique.join("\n"));
    showNotification("🗑️ Duplicate lines removed!", "success");
  };

  const copyToClipboard = async () => {
    if (!editedText.trim()) {
      showNotification("No text to copy", "warning");
      return;
    }
    await navigator.clipboard.writeText(editedText);
    showNotification("📋 Copied to clipboard!", "success");
  };

  const saveToHymnBook = async () => {
    if (!editedText.trim()) {
      showNotification("No lyrics to save", "error");
      return;
    }
    
    const title = prompt("Enter hymn title:", editedText.split("\n")[0]?.substring(0, 100) || "Untitled");
    if (!title) return;
    
    const reference = prompt("Enter hymn reference (optional):", "");
    
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${BASE_URL}/api/admin/songs`,
        { title, reference: reference || null, lyrics: editedText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showNotification(`✅ Hymn "${title}" saved!`, "success");
      setTimeout(() => navigate("/admin/hymns"), 1000);
    } catch (err) {
      showNotification("Failed to save hymn", "error");
    }
  };

  const resetAll = () => {
    stopCameraTracks();
    setImage(null);
    setImagePreview(null);
    setEditedText("");
    setConfidence(0);
    setStep("upload");
    setCrop(null);
    setCompletedCrop(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    showNotification("Reset complete!", "info");
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      role: "user",
      content: userMessage,
      timestamp: new Date()
    }]);
    setChatInput("");
    setChatLoading(true);
    
    let response = "";
    const lowerMsg = userMessage.toLowerCase();
    
    if (lowerMsg.includes("how to")) {
      response = "📸 **Steps:**\n1. Take/upload photo\n2. Crop to lyrics\n3. Click 'Extract Lyrics'\n4. Edit & save\n\n**Tips:** Good lighting = better results!";
    } else if (lowerMsg.includes("thank")) {
      response = "You're welcome! 🙏 Happy to help!";
    } else {
      response = "I'm here to help! 📸 Take a photo or upload an image of hymn lyrics, and I'll extract the text for you!";
    }
    
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: "assistant",
        content: response,
        timestamp: new Date()
      }]);
      setChatLoading(false);
    }, 500);
  };

  const handleChatKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const getVerseCount = () => editedText.split("\n\n").filter(v => v.trim()).length;
  const getLineCount = () => editedText.split("\n").filter(l => l.trim()).length;
  const getWordCount = () => editedText.split(/\s+/).filter(w => w.length > 0).length;

  return (
    <div style={styles.container}>
      <div style={styles.overlay}></div>
      
      {notification && (
        <div style={{
          ...styles.notification,
          background: notification.type === "success" ? "#10b981" : 
                     notification.type === "error" ? "#ef4444" : 
                     notification.type === "warning" ? "#f59e0b" : "#3b82f6"
        }}>
          {notification.type === "success" && <FiCheck size={18} />}
          {notification.type === "error" && <FiAlertCircle size={18} />}
          {notification.type === "info" && <FiLoader size={18} className="spinning" />}
          <span>{notification.message}</span>
        </div>
      )}
      
      <div style={styles.content}>
        <div style={styles.header}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <FiArrowLeft size={20} /> Back
          </button>
          <h1 style={styles.title}>📷 OCR Lyrics Scanner</h1>
          <div style={{ width: "80px" }}></div>
        </div>

        <div style={styles.tabContainer}>
          <button onClick={() => setActiveTab("scan")} style={{...styles.tab, ...(activeTab === "scan" ? styles.activeTab : {})}}>
            <FiCamera size={16} /> Scan Lyrics
          </button>
          <button onClick={() => setActiveTab("chat")} style={{...styles.tab, ...(activeTab === "chat" ? styles.activeTab : {})}}>
            <FiMessageSquare size={16} /> Assistant
          </button>
        </div>

        {activeTab === "scan" && (
          <>
            {step === "upload" && (
              <div style={styles.uploadContainer}>
                <div style={styles.uploadGrid}>
                  <div style={styles.uploadCard} onClick={() => fileInputRef.current?.click()}>
                    <FiUpload size={48} color="#a78bfa" />
                    <h3>Upload Image</h3>
                    <p>Select from gallery</p>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
                  </div>
                  <div style={styles.uploadCard} onClick={startCamera}>
                    <FiCamera size={48} color="#a78bfa" />
                    <h3>Take Photo</h3>
                    <p>Use camera</p>
                  </div>
                </div>
                <div style={styles.tipsCard}>
                  <h4>💡 Tips for best results:</h4>
                  <div style={styles.tipsGrid}>
                    <span>📸 Good lighting</span>
                    <span>📏 Keep book flat</span>
                    <span>🔍 Text in focus</span>
                    <span>✏️ Edit after extraction</span>
                  </div>
                </div>
              </div>
            )}

            {step === "camera" && (
              <div style={styles.cameraContainer}>
                <div style={styles.cameraView}>
                  <video ref={videoRef} style={styles.video} autoPlay playsInline muted />
                  <canvas ref={canvasRef} style={{ display: "none" }} />
                </div>
                <div style={styles.cameraControls}>
                  <button onClick={stopCamera} style={styles.cancelBtn}><FiX size={18} /> Cancel</button>
                  <button onClick={capturePhoto} style={styles.captureBtn}><FiCamera size={18} /> Capture</button>
                </div>
              </div>
            )}

            {step === "crop" && imagePreview && (
              <div style={styles.cropContainer}>
                <div style={styles.cropHeader}>
                  <h3>✂️ Crop Image</h3>
                  <p>Drag corners to select lyrics area</p>
                </div>
                <div style={styles.cropToolbar}>
                  <button onClick={handleRotate} style={styles.cropToolBtn}><FiRotateCw size={18} /> Rotate</button>
                </div>
                <div style={styles.cropArea}>
                  <ReactCrop crop={crop} onChange={(c) => setCrop(c)} onComplete={(c) => setCompletedCrop(c)}>
                    <img ref={imgRef} src={imagePreview} alt="Crop preview" style={styles.cropImage} onLoad={onImageLoad} />
                  </ReactCrop>
                </div>
                <div style={styles.cropActions}>
                  <button onClick={skipCrop} style={styles.skipBtn}>Skip Crop</button>
                  <button onClick={applyCrop} style={styles.applyBtn}><FiCheck size={18} /> Apply Crop</button>
                </div>
              </div>
            )}

            {step === "process" && imagePreview && (
              <div style={styles.processContainer}>
                <div style={styles.processCard}>
                  <img src={imagePreview} alt="Preview" style={styles.previewImage} />
                  <button onClick={resetAll} style={styles.resetBtn}><FiRefreshCw /> Change Image</button>
                  <button onClick={processOCR} disabled={processing} style={styles.processBtn}>
                    {processing ? <><FiLoader className="spinning" /> {processingStatus}</> : <><FiImage /> Extract Lyrics</>}
                  </button>
                </div>
              </div>
            )}

            {step === "edit" && (
              <div style={styles.editContainer}>
                <div style={styles.confidenceBox}>
                  <span>🎯 Confidence: </span>
                  <strong style={{ color: confidence > 80 ? "#10b981" : "#f59e0b" }}>{confidence}%</strong>
                  <span style={{ marginLeft: "auto" }}>{getWordCount()} words</span>
                </div>

                <div style={styles.toolbar}>
                  <button onClick={cleanFormatting} style={styles.toolBtn}><FiRefreshCw /> Clean</button>
                  <button onClick={formatLyrics} style={styles.toolBtn}><FiBold /> Bold Chorus</button>
                  <button onClick={capitalizeLines} style={styles.toolBtn}><FiAlignLeft /> Capitalize</button>
                  <button onClick={addVerseNumbers} style={styles.toolBtn}><FiList /> Add Numbers</button>
                  <button onClick={removeVerseNumbers} style={styles.toolBtn}><FiX /> Remove Numbers</button>
                  <button onClick={fixCommonErrors} style={styles.toolBtn}><MdOutlineAutoAwesome /> Fix OCR</button>
                  <button onClick={removeDuplicates} style={styles.toolBtn}><FiTrash2 /> Remove Dups</button>
                  <button onClick={copyToClipboard} style={styles.copyBtn}><FiCopy /> Copy</button>
                </div>

                <div style={styles.stats}>
                  <span>📊 {getVerseCount()} verses</span>
                  <span>📝 {getLineCount()} lines</span>
                  <span>📖 {getWordCount()} words</span>
                </div>

                <textarea value={editedText} onChange={(e) => setEditedText(e.target.value)} style={styles.textarea} rows={15} placeholder="Extracted lyrics will appear here..." />

                <div style={styles.actionBar}>
                  <button onClick={resetAll} style={styles.resetButton}><FiRefreshCw /> Start Over</button>
                  <button onClick={saveToHymnBook} style={styles.saveButton}><FiSave /> Save to Hymn Book</button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "chat" && (
          <div style={styles.chatContainer}>
            <div style={styles.chatHeader}>
              <div style={styles.chatHeaderLeft}><FiMessageSquare size={20} /> 💬 OCR Assistant</div>
            </div>
            <div style={styles.chatMessages}>
              {chatMessages.map((msg) => (
                <div key={msg.id} style={{...styles.chatMessage, ...(msg.role === "user" ? styles.chatUser : styles.chatAssistant)}}>
                  <div style={styles.chatAvatar}>{msg.role === "user" ? "👤" : "🤖"}</div>
                  <div style={styles.chatBubble}>
                    <div style={styles.chatText}>{msg.content}</div>
                    <div style={styles.chatTime}>{formatTime(msg.timestamp)}</div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={styles.chatTyping}>
                  <div style={styles.chatAvatar}>🤖</div>
                  <div style={styles.typingBubble}><div style={styles.typingDot}></div><div style={styles.typingDot}></div><div style={styles.typingDot}></div></div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={styles.chatInputContainer}>
              <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={handleChatKeyPress} placeholder="Ask for help..." style={styles.chatInput} rows={2} />
              <button onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()} style={styles.chatSendBtn}><FiSend size={20} /></button>
            </div>
            <div style={styles.chatSuggestions}>
              <button onClick={() => setChatInput("How to extract lyrics?")} style={styles.suggestionBtn}>📸 How to extract?</button>
              <button onClick={() => setChatInput("Tips for better OCR")} style={styles.suggestionBtn}>💡 Tips</button>
            </div>
          </div>
        )}
      </div>

      <style>{`.spinning { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", top: 60, position: "relative" },
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", zIndex: 0 },
  notification: { position: "fixed", top: "70px", left: "50%", transform: "translateX(-50%)", zIndex: 10000, padding: "12px 24px", borderRadius: "50px", color: "white", fontSize: "14px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 4px 15px rgba(0,0,0,0.3)" },
  content: { position: "relative", zIndex: 2, maxWidth: "1000px", margin: "0 auto", padding: "30px 24px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
  backBtn: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "40px", color: "white", cursor: "pointer" },
  title: { fontSize: "24px", fontWeight: "700", background: "linear-gradient(135deg, #a78bfa, #f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 },
  tabContainer: { display: "flex", gap: "12px", marginBottom: "30px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "12px" },
  tab: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 24px", background: "transparent", border: "none", borderRadius: "30px", color: "rgba(255,255,255,0.6)", fontSize: "15px", fontWeight: "500", cursor: "pointer" },
  activeTab: { background: "linear-gradient(135deg, #8b5cf6, #6366f1)", color: "white" },
  uploadContainer: { maxWidth: "600px", margin: "0 auto" },
  uploadGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" },
  uploadCard: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "40px 20px", textAlign: "center", cursor: "pointer", color: "white" },
  tipsCard: { background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "16px", padding: "16px 20px", color: "white" },
  tipsGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginTop: "12px", fontSize: "13px", color: "rgba(255,255,255,0.7)" },
  cameraContainer: { textAlign: "center", maxWidth: "600px", margin: "0 auto" },
  cameraView: { background: "#000", borderRadius: "16px", overflow: "hidden", marginBottom: "16px" },
  video: { width: "100%", height: "auto", maxHeight: "500px", objectFit: "cover" },
  cameraControls: { display: "flex", gap: "16px", justifyContent: "center" },
  captureBtn: { padding: "12px 24px", background: "#2563eb", color: "white", border: "none", borderRadius: "40px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" },
  cancelBtn: { padding: "12px 24px", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "40px", cursor: "pointer" },
  cropContainer: { maxWidth: "800px", margin: "0 auto" },
  cropHeader: { textAlign: "center", marginBottom: "20px", color: "white" },
  cropToolbar: { display: "flex", justifyContent: "center", marginBottom: "16px" },
  cropToolBtn: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "30px", color: "white", cursor: "pointer" },
  cropArea: { background: "rgba(0,0,0,0.5)", borderRadius: "16px", padding: "20px", marginBottom: "20px", display: "flex", justifyContent: "center" },
  cropImage: { maxWidth: "100%", maxHeight: "60vh", objectFit: "contain" },
  cropActions: { display: "flex", gap: "16px", justifyContent: "center" },
  skipBtn: { padding: "10px 24px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "40px", color: "white", cursor: "pointer" },
  applyBtn: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 24px", background: "#10b981", border: "none", borderRadius: "40px", color: "white", cursor: "pointer" },
  processContainer: { maxWidth: "500px", margin: "0 auto", textAlign: "center" },
  processCard: { background: "rgba(255,255,255,0.05)", borderRadius: "20px", padding: "24px" },
  previewImage: { width: "100%", maxHeight: "300px", objectFit: "contain", borderRadius: "12px", marginBottom: "16px" },
  resetBtn: { padding: "8px 16px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "30px", color: "white", cursor: "pointer", marginBottom: "20px" },
  processBtn: { width: "100%", padding: "14px", background: "#10b981", color: "white", border: "none", borderRadius: "40px", fontSize: "16px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" },
  editContainer: { maxWidth: "800px", margin: "0 auto" },
  confidenceBox: { padding: "12px 16px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", marginBottom: "20px", color: "white", display: "flex", alignItems: "center", gap: "8px" },
  toolbar: { display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.1)" },
  toolBtn: { padding: "8px 16px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "30px", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" },
  copyBtn: { padding: "8px 16px", background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: "30px", color: "#a78bfa", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" },
  stats: { display: "flex", gap: "20px", marginBottom: "16px", padding: "10px 16px", background: "rgba(37,99,235,0.15)", borderRadius: "12px", color: "rgba(255,255,255,0.7)", fontSize: "13px" },
  textarea: { width: "100%", padding: "20px", background: "#0a0a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", color: "white", fontSize: "14px", lineHeight: "1.6", fontFamily: "monospace", marginBottom: "20px" },
  actionBar: { display: "flex", gap: "16px", justifyContent: "flex-end" },
  resetButton: { padding: "12px 24px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "40px", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" },
  saveButton: { padding: "12px 28px", background: "#2563eb", border: "none", borderRadius: "40px", color: "white", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" },
  chatContainer: { background: "rgba(255,255,255,0.05)", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", display: "flex", flexDirection: "column", height: "500px" },
  chatHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "rgba(0,0,0,0.3)", borderBottom: "1px solid rgba(255,255,255,0.1)" },
  chatHeaderLeft: { display: "flex", alignItems: "center", gap: "10px", color: "white", fontWeight: "600" },
  chatMessages: { flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" },
  chatMessage: { display: "flex", gap: "12px", alignItems: "flex-start" },
  chatUser: { flexDirection: "row-reverse" },
  chatAssistant: {},
  chatAvatar: { width: "36px", height: "36px", borderRadius: "18px", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 },
  chatBubble: { maxWidth: "75%", padding: "12px 16px", borderRadius: "18px", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.9)", lineHeight: "1.5", fontSize: "14px" },
  chatText: { whiteSpace: "pre-wrap" },
  chatTime: { fontSize: "10px", color: "rgba(255,255,255,0.4)", marginTop: "6px", textAlign: "right" },
  chatTyping: { display: "flex", gap: "12px", alignItems: "center" },
  typingBubble: { padding: "12px 16px", borderRadius: "18px", background: "rgba(255,255,255,0.08)", display: "flex", gap: "6px" },
  typingDot: { width: "8px", height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.5)", animation: "typing 1.4s infinite ease-in-out" },
  chatInputContainer: { display: "flex", gap: "12px", padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.2)" },
  chatInput: { flex: 1, padding: "12px 16px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px", color: "white", fontSize: "14px", resize: "none", fontFamily: "inherit" },
  chatSendBtn: { width: "44px", height: "44px", borderRadius: "22px", background: "linear-gradient(135deg, #8b5cf6, #6366f1)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  chatSuggestions: { padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: "10px", flexWrap: "wrap" },
  suggestionBtn: { padding: "8px 16px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "30px", color: "rgba(255,255,255,0.8)", fontSize: "13px", cursor: "pointer" }
};