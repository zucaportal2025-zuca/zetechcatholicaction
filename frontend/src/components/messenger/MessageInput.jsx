// frontend/src/components/messenger/MessageInput.jsx
import React, { useRef, useState } from 'react';
import { Smile, Paperclip, Send, Image, File, X, Music, Film } from 'lucide-react';
import { useMessenger } from '../../contexts/MessengerContext';

const MessageInput = ({ 
  value, 
  onChange, 
  onSend, 
  onTyping, 
  onStopTyping, 
  onKeyPress,
  attachments,
  setAttachments,
  sending,
  inputRef 
}) => {
  const { uploadFile } = useMessenger();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    
    for (const file of files) {
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert('File too large. Maximum size is 50MB.');
        continue;
      }

      const uploadedFile = await uploadFile(file);
      if (uploadedFile) {
        setAttachments(prev => [...prev, uploadedFile]);
      }
    }
    
    setUploading(false);
    fileInputRef.current.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <Image size={16} />;
    if (type?.startsWith('video/')) return <Film size={16} />;
    if (type?.startsWith('audio/')) return <Music size={16} />;
    return <File size={16} />;
  };

  const emojis = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🤲', '👐', '🙌', '👏', '🤝', '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '🖕', '✍️', '🙏', '🦶', '🦵', '🦿', '💄', '💋', '👄', '🦷', '👅', '👂', '🦻', '👃', '👣', '👁️', '👀', '🧠', '🫀', '🫁', '🗣️', '👤', '👥', '🫂', '👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👩‍🦱', '👨‍🦱', '👩‍🦰', '👨‍🦰', '👱‍♀️', '👱‍♂️', '👩‍🦳', '👨‍🦳', '👩‍🦲', '👨‍🦲', '🧔‍♀️', '🧔‍♂️', '👵', '🧓', '👴', '👲', '👳‍♀️', '👳‍♂️', '🧕', '👮‍♀️', '👮‍♂️', '👷‍♀️', '👷‍♂️', '💂‍♀️', '💂‍♂️', '🕵️‍♀️', '🕵️‍♂️', '👩‍⚕️', '👨‍⚕️', '👩‍🌾', '👨‍🌾', '👩‍🍳', '👨‍🍳', '👩‍🎓', '👨‍🎓', '👩‍🎤', '👨‍🎤', '👩‍🏫', '👨‍🏫', '👩‍🏭', '👨‍🏭', '👩‍💻', '👨‍💻', '👩‍💼', '👨‍💼', '👩‍🔧', '👨‍🔧', '👩‍🔬', '👨‍🔬', '👩‍🎨', '👨‍🎨', '👩‍🚒', '👨‍🚒', '👩‍✈️', '👨‍✈️', '👩‍🚀', '👨‍🚀', '👩‍⚖️', '👨‍⚖️', '👰‍♀️', '👰‍♂️', '🤵‍♀️', '🤵‍♂️', '👸', '🤴', '🦸‍♀️', '🦸‍♂️', '🦹‍♀️', '🦹‍♂️', '🧙‍♀️', '🧙‍♂️', '🧚‍♀️', '🧚‍♂️', '🧛‍♀️', '🧛‍♂️', '🧜‍♀️', '🧜‍♂️', '🧝‍♀️', '🧝‍♂️', '🧞‍♀️', '🧞‍♂️', '🧟‍♀️', '🧟‍♂️', '💆‍♀️', '💆‍♂️', '💇‍♀️', '💇‍♂️', '🚶‍♀️', '🚶‍♂️', '🧍‍♀️', '🧍‍♂️', '🧎‍♀️', '🧎‍♂️', '🏃‍♀️', '🏃‍♂️', '💃', '🕺', '🕴️', '👯‍♀️', '👯‍♂️', '🧖‍♀️', '🧖‍♂️', '🧗‍♀️', '🧗‍♂️', '🤸‍♀️', '🤸‍♂️', '🤼‍♀️', '🤼‍♂️', '🤽‍♀️', '🤽‍♂️', '🤾‍♀️', '🤾‍♂️', '🤺', '🏌️‍♀️', '🏌️‍♂️', '🏇', '⛷️', '🏂', '🏄‍♀️', '🏄‍♂️', '🚣‍♀️', '🚣‍♂️', '🏊‍♀️', '🏊‍♂️', '⛹️‍♀️', '⛹️‍♂️', '🏋️‍♀️', '🏋️‍♂️', '🚴‍♀️', '🚴‍♂️', '🚵‍♀️', '🚵‍♂️', '🧘‍♀️', '🧘‍♂️', '🦯', '🦮', '🐕‍🦺', '🧑‍🦽', '🧑‍🦼', '🦽', '🦼', '🛴', '🛵', '🚲', '🛹', '🛼', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛺', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '🚁', '🛩️', '✈️', '🛫', '🛬', '🛰️', '🚀', '🛸', '🚤', '🛥️', '⛵', '🛶', '🚢', '🛳️', '🚟', '🚠', '🚡', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '🚁', '🛩️', '✈️', '🛫', '🛬'];

  const addEmoji = (emoji) => {
    onChange(value + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  return (
    <div className="message-input-container">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="attachments-preview">
          {attachments.map((file, index) => (
            <div key={index} className="attachment-item">
              {file.type?.startsWith('image/') ? (
                <img src={file.url} alt={file.name} className="attachment-thumb" />
              ) : (
                <div className="attachment-icon">
                  {getFileIcon(file.type)}
                </div>
              )}
              <div className="attachment-info">
                <span className="attachment-name">{file.name}</span>
                <span className="attachment-size">{formatFileSize(file.size)}</span>
              </div>
              <button className="remove-attachment" onClick={() => removeAttachment(index)}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="input-area">
        <button 
          className="input-btn emoji-btn"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          <Smile size={22} />
        </button>

        <button 
          className="input-btn attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Paperclip size={22} />
        </button>

        <input
          ref={inputRef}
          type="text"
          className="message-input"
          placeholder="Type a message"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            onTyping();
          }}
          onKeyPress={onKeyPress}
          onBlur={onStopTyping}
        />

        <button 
          className={`send-btn ${!value.trim() && attachments.length === 0 ? 'disabled' : ''}`}
          onClick={onSend}
          disabled={(!value.trim() && attachments.length === 0) || sending}
        >
          <Send size={20} />
        </button>
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="emoji-picker">
          <div className="emoji-header">
            <span>Emojis</span>
            <button className="close-emoji" onClick={() => setShowEmojiPicker(false)}>
              <X size={16} />
            </button>
          </div>
          <div className="emoji-grid">
            {emojis.map((emoji, index) => (
              <button key={index} className="emoji-item" onClick={() => addEmoji(emoji)}>
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <style jsx>{`
        .message-input-container {
          background: #FFFFFF;
          border-top: 1px solid #E9EDEF;
          padding: 8px 12px;
          position: relative;
        }

        /* Attachments Preview */
        .attachments-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
          padding: 8px;
          background: #F5F6F6;
          border-radius: 12px;
        }

        .attachment-item {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #FFFFFF;
          padding: 8px 12px;
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          position: relative;
        }

        .attachment-thumb {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          object-fit: cover;
        }

        .attachment-icon {
          width: 40px;
          height: 40px;
          background: #F0F2F5;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #667781;
        }

        .attachment-info {
          flex: 1;
        }

        .attachment-name {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: #111B21;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .attachment-size {
          font-size: 10px;
          color: #667781;
        }

        .remove-attachment {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #667781;
        }

        .remove-attachment:hover {
          background: #F0F2F5;
        }

        /* Input Area */
        .input-area {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .input-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #667781;
          transition: background 0.2s;
        }

        .input-btn:hover {
          background: #F0F2F5;
        }

        .input-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .message-input {
          flex: 1;
          border: none;
          background: #F0F2F5;
          border-radius: 30px;
          padding: 10px 16px;
          font-size: 14px;
          outline: none;
          color: #111B21;
        }

        .message-input::placeholder {
          color: #667781;
        }

        .send-btn {
          background: #075E54;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #FFFFFF;
          transition: background 0.2s;
        }

        .send-btn:hover:not(.disabled) {
          background: #054a42;
        }

        .send-btn.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Emoji Picker */
        .emoji-picker {
          position: absolute;
          bottom: 100%;
          left: 12px;
          right: 12px;
          background: #FFFFFF;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          margin-bottom: 8px;
          z-index: 100;
          max-height: 300px;
          display: flex;
          flex-direction: column;
        }

        .emoji-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #E9EDEF;
          font-weight: 500;
          color: #111B21;
        }

        .close-emoji {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #667781;
        }

        .close-emoji:hover {
          background: #F0F2F5;
        }

        .emoji-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 4px;
          padding: 12px;
          overflow-y: auto;
          max-height: 250px;
        }

        .emoji-item {
          background: transparent;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .emoji-item:hover {
          background: #F0F2F5;
          transform: scale(1.1);
        }

        @media (max-width: 768px) {
          .message-input-container {
            padding: 6px 10px;
          }
          
          .message-input {
            font-size: 13px;
            padding: 8px 12px;
          }
          
          .send-btn {
            width: 36px;
            height: 36px;
          }
          
          .emoji-grid {
            grid-template-columns: repeat(7, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default MessageInput;