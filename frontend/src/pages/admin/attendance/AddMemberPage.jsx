import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { X, User, Phone, Briefcase, Home, FileText, Search, CheckCircle, Users, Upload, Clock, Hash, Plus, List, ArrowLeft } from 'lucide-react';
import { api } from '../../../api';
import { FaUsers } from 'react-icons/fa';

const USERS_CACHE_KEY = 'cached_users';
const CACHE_TTL = 5 * 60 * 1000;

export default function AddMemberPage() {
  const { sheetId } = useParams();
const navigate = useNavigate();
const location = useLocation();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
 const basePath = (user?.role === "admin" || user?.specialRole === "admin") ? "/admin" : "/secretary";
  
  // ============ STATE ============
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    role: 'member',
    specialRole: '',
    membershipNumber: '',
    jumuiaId: '',
    jumuiaName: '',
    signTime: '',
    notes: ''
  });
  
  const [jumuiaList, setJumuiaList] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingJumuia, setLoadingJumuia] = useState(true);
  const [bulkProgress, setBulkProgress] = useState(0);
const [isAdding, setIsAdding] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [bulkPreview, setBulkPreview] = useState([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
const [showSuggestions, setShowSuggestions] = useState(false);
const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [draftId, setDraftId] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  

  // Auto-number the bulk data
// Auto-number the bulk data
const autoNumberBulkData = (text) => {
  const lines = text.split('\n');
  let numberedLines = [];
  let counter = 1;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      numberedLines.push('');
      continue;
    }
    
    // Remove any existing number at start (e.g., "1. " or "2) ")
    const cleanLine = trimmed.replace(/^\d+[\.\)]\s*/, '');
    
    // Add new number
    numberedLines.push(`${counter}. ${cleanLine}`);
    counter++;
  }
  
  return numberedLines.join('\n');
};
  
  // 🔥 NEW: Store all users in memory for fast matching
  const [allUsers, setAllUsers] = useState([]);
  const [phoneMap, setPhoneMap] = useState(new Map());
  const [usersLoaded, setUsersLoaded] = useState(false);
  const debounceTimer = useRef(null);
  
  const DRAFT_KEY = 'add_member_draft';


  // Get name suggestions from existing users
const getNameSuggestions = (inputText) => {
  if (!inputText || inputText.length < 2 || allUsers.length === 0) {
    setSuggestions([]);
    setShowSuggestions(false);
    return;
  }

  const searchTerm = inputText.toUpperCase().trim();
  const matchedUsers = [];
  
  // Search through all users (max 8 results)
  for (const user of allUsers) {
    const fullName = user.fullName.toUpperCase();
    if (fullName.includes(searchTerm)) {
      matchedUsers.push({
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        membershipNumber: user.membership_number,
        role: user.role
      });
      if (matchedUsers.length >= 8) break;
    }
  }
  
  setSuggestions(matchedUsers);
  setShowSuggestions(matchedUsers.length > 0);
  setActiveSuggestionIndex(-1);
};
  
  // ============ FETCH ALL USERS ONCE (NEW) ============
  // ============ FETCH ALL USERS ONCE ============
const fetchAllUsers = useCallback(async () => {
  // Check cache first
  try {
    const cached = localStorage.getItem(USERS_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      if (age < CACHE_TTL) {
        console.log(`📦 Using cached users (${data.length} total users)`);
processUsers(data);
        return;
      }
    }
  } catch (e) {
    console.log('Cache read error:', e);
  }

  try {
    console.log('📡 Fetching lightweight users...');
    const startTime = Date.now();
    
    const response = await api.get('/api/users/light');
    const data = response.data;
    
    // ✅ Handle both paginated and array responses
    let users = [];
    if (Array.isArray(data)) {
      // Direct array response
      users = data;
    } else if (data && data.users && Array.isArray(data.users)) {
      // Paginated response with { users: [], total, page, totalPages }
      users = data.users;
      console.log(`📊 Total users: ${data.total}, Page: ${data.page}/${data.totalPages}`);
    } else {
      console.warn('⚠️ Unexpected response format:', data);
      users = [];
    }
    
    console.log(`✅ Loaded ${users.length} users in ${Date.now() - startTime}ms`);
    
    // Cache the data
    try {
      localStorage.setItem(USERS_CACHE_KEY, JSON.stringify({
        data: users,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.log('Cache save error:', e);
    }
    
    processUsers(users);
    
  } catch (error) {
    console.error('Error fetching users:', error);
    // Fallback to the old endpoint if needed
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const users = response.data || [];
      const nonAdmins = users.filter(u => u.role !== 'admin');
      processUsers(nonAdmins);
    } catch (e) {
      console.error('Fallback also failed:', e);
    }
  }
}, []);

// ============ PROCESS USERS (BUILD PHONE MAP) ============
const processUsers = useCallback((users) => {
  
  setAllUsers(users);
  
  const map = new Map();
  
  for (const u of users) {
    if (u.phone) {
      const phone = u.phone.trim();
      
      // Store ALL formats
      map.set(phone, u);
      
      // Remove spaces and dashes
      const clean = phone.replace(/[\s\-]/g, '');
      map.set(clean, u);
      
      // Store without leading 0
      if (phone.startsWith('0')) {
        map.set(phone.substring(1), u);
        map.set(`+254${phone.substring(1)}`, u);
        map.set(`254${phone.substring(1)}`, u);
      }
      
      // Store without +254
      if (phone.startsWith('+254')) {
        map.set(phone.substring(1), u);
        map.set(phone.substring(4), u);
        map.set(`0${phone.substring(4)}`, u);
        map.set(`254${phone.substring(4)}`, u);
      }
      
      // Store with +254
      if (phone.startsWith('254') && !phone.startsWith('+254')) {
        map.set(`+${phone}`, u);
        map.set(`0${phone.substring(3)}`, u);
        map.set(`+254${phone.substring(3)}`, u);
      }
    }
  }
  
  setPhoneMap(map);
  setUsersLoaded(true);
  console.log(`✅ Phone map built with ${map.size} entries`);
}, []);
  
  // Load users once on mount
  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  // Check if we should default to bulk mode
useEffect(() => {
  if (location.state?.defaultToBulkMode) {
    setIsBulkMode(true);
  }
}, [location]);
  
  // ============ DRAFT FUNCTIONS ============
  
  const loadDraft = () => {
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (stored) {
        const draft = JSON.parse(stored);
        if (draft.sheetId === sheetId) {
          setFormData(draft.formData);
          setIsBulkMode(draft.isBulkMode || false);
          if (draft.bulkData) {
            setBulkData(draft.bulkData);
          }
          setDraftId(draft.id);
          setLastSaved(new Date(draft.timestamp));
        }
      }
    } catch (e) {
      console.error('Error loading draft:', e);
    }
  };
  
  const saveDraft = (data, silent = false) => {
    try {
      const draftData = {
        id: draftId || Date.now().toString(),
        formData: data,
        isBulkMode: isBulkMode,
        bulkData: isBulkMode ? bulkData : '',
        sheetId: sheetId,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      setDraftId(draftData.id);
      setLastSaved(new Date());
      
      if (!silent) {
        showToastMessage('💾 Draft saved!', 'success');
      }
    } catch (e) {
      console.error('Error saving draft:', e);
    }
  };
  
  // Auto-save on change
  useEffect(() => {
    const timer = setTimeout(() => {
      const hasData = formData.fullName || formData.phoneNumber || formData.notes || (isBulkMode && bulkData);
      if (hasData) {
        saveDraft(formData, true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [formData, bulkData, isBulkMode]);
  
  const clearDraft = () => {
    if (!confirm('Clear this draft?')) return;
    localStorage.removeItem(DRAFT_KEY);
    setFormData({
      fullName: '',
      phoneNumber: '',
      role: 'member',
      specialRole: '',
      membershipNumber: '',
      jumuiaId: '',
      jumuiaName: '',
      signTime: '',
      notes: ''
    });
    setBulkData('');
    setBulkPreview([]);
    setSelectedUser(null);
    setDraftId(null);
    setLastSaved(null);
    showToastMessage('🧹 Draft cleared', 'info');
  };
  
  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };
  
  // ============ FETCH JUMUIA LIST ============
  useEffect(() => {
    const fetchJumuia = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await api.get('/api/jumuia', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setJumuiaList(response.data || []);
      } catch (error) {
        console.error('Error fetching jumuia:', error);
      } finally {
        setLoadingJumuia(false);
      }
    };
    fetchJumuia();
    loadDraft();
  }, []);
  
  // ============ SEARCH USER BY PHONE ============
  const searchUserByPhone = async (phone) => {
    if (!phone || phone.length < 6) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const users = response.data || [];
      const results = users.filter(user => 
        user.phone && user.phone.includes(phone) ||
        user.membership_number && user.membership_number.includes(phone)
      );
      setSearchResults(results.slice(0, 5));
    } catch (error) {
      console.error('Error searching user:', error);
    } finally {
      setSearching(false);
    }
  };
  
  // ============ HANDLE INPUT CHANGE ============
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'phoneNumber') {
      searchUserByPhone(value);
    }
  };
  
  // ============ SELECT EXISTING USER ============
  const selectUser = (user) => {
    setSelectedUser(user);
    setFormData({
      fullName: user.fullName,
      phoneNumber: user.phone || '',
      role: user.role || 'member',
      specialRole: user.specialRole || '',
      membershipNumber: user.membership_number || '',
      jumuiaId: user.jumuiaId || '',
      jumuiaName: user.homeJumuia?.name || '',
      signTime: '',
      notes: ''
    });
    setSearchResults([]);
  };
  
  // ============ CLEAR SELECTION ============
  const clearSelection = () => {
    setSelectedUser(null);
    setFormData({
      fullName: '',
      phoneNumber: '',
      role: 'member',
      specialRole: '',
      membershipNumber: '',
      jumuiaId: '',
      jumuiaName: '',
      signTime: '',
      notes: ''
    });
  };
  
 // ============ SMART PARSE BULK DATA (AUTO-DETECTS PHONE NUMBERS) ============
// Helper: Check if a string looks like a phone number
const isPhoneNumber = (str) => {
  if (!str) return false;
  const clean = str.replace(/[\s\-\(\)]/g, '');
  const phoneRegex = /^(\+?254|0)?[71]\d{8}$/;
  const generalRegex = /^(\+?254|0)?\d{9,12}$/;
  return phoneRegex.test(clean) || generalRegex.test(clean);
};

// Helper: Extract phone number from a string
const extractPhoneNumber = (text) => {
  const patterns = [
    /\+\d{11,13}/,
    /0\d{9,10}/,
    /254\d{9,10}/,
    /[7|1]\d{8}/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const candidate = match[0];
      if (isPhoneNumber(candidate)) {
        return candidate;
      }
    }
  }
  
  const parts = text.split(/\s+/);
  for (const part of parts) {
    if (isPhoneNumber(part)) {
      return part;
    }
  }
  
  return null;
};

// Smart parse function
const smartParseLine = (line) => {
  let trimmed = line.trim().toUpperCase();
  if (!trimmed) return { valid: false, fullName: '', phoneNumber: null, role: 'Guest', membershipNumber: null, signTime: null, existingUser: null, isAutoFilled: false };

  trimmed = trimmed.replace(/^\d+[\.\)]\s*/, '');
  
  // CASE 1: Has comma - normal parsing
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim());
    
    let phoneNumber = null;
    let nameParts = [];
    let role = 'Guest';
    let membershipNumber = null;
    let signTime = null;
    
    for (const part of parts) {
      if (isPhoneNumber(part)) {
        phoneNumber = part;
      } else if (part.match(/^Z#\d+$/i)) {
        membershipNumber = part;
      } else if (part.match(/^\d{4}-\d{2}-\d{2}/)) {
        signTime = part;
      } else if (['member', 'guest', 'admin', 'treasurer', 'secretary', 'jumuia_leader'].includes(part.toLowerCase())) {
        role = part;
      } else {
        nameParts.push(part);
      }
    }
    
      return {
  fullName: nameParts.join(' ').trim() || '',
  phoneNumber: phoneNumber || null,
  role: role || 'Guest',
  membershipNumber: membershipNumber || null,
  signTime: signTime || null,
  valid: true,
  existingUser: null,
  isAutoFilled: false
};
  }
  
  // CASE 2: No comma - try to detect phone number in the text
  const phoneNumber = extractPhoneNumber(trimmed);
  
  if (phoneNumber) {
    let fullName = trimmed.replace(phoneNumber, '').trim();
    fullName = fullName.replace(/\s+/g, ' ').trim();
    
        return {
      fullName: fullName || '',
      phoneNumber: phoneNumber,
      role: 'Guest',
      membershipNumber: null,
      signTime: null,
      valid: !!fullName,
      existingUser: null,
      isAutoFilled: false
    };
  }
  
  // CASE 3: No phone number found - treat entire line as name
   return {
    fullName: trimmed,
    phoneNumber: null,
    role: 'Guest',
    membershipNumber: null,
    signTime: null,
    valid: true,
    existingUser: null,
    isAutoFilled: false
  };
};

const parseBulkData = useCallback(() => {
  const lines = bulkData.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    setBulkPreview([]);
    return;
  }
  
  const parsed = [];
  
  for (const line of lines) {
    const entry = smartParseLine(line);
    
    // Check if phone number exists and try to find existing user
    if (entry.phoneNumber && phoneMap.size > 0) {
      const cleanPhone = entry.phoneNumber.trim().replace(/[\s\-]/g, '');
      
      let existingUser = null;
      
      if (cleanPhone.startsWith('+254')) {
        existingUser = phoneMap.get(cleanPhone);
        if (!existingUser) existingUser = phoneMap.get(cleanPhone.substring(1));
        if (!existingUser) existingUser = phoneMap.get(cleanPhone.substring(4));
        if (!existingUser) existingUser = phoneMap.get(`0${cleanPhone.substring(4)}`);
        if (!existingUser) existingUser = phoneMap.get(cleanPhone.substring(4).replace(/^0+/, ''));
      } else if (cleanPhone.startsWith('254')) {
        existingUser = phoneMap.get(cleanPhone);
        if (!existingUser) existingUser = phoneMap.get(`+${cleanPhone}`);
        if (!existingUser) existingUser = phoneMap.get(`0${cleanPhone.substring(3)}`);
        if (!existingUser) existingUser = phoneMap.get(cleanPhone.substring(3));
        if (!existingUser) existingUser = phoneMap.get(cleanPhone.substring(3).replace(/^0+/, ''));
      } else if (cleanPhone.startsWith('0')) {
        existingUser = phoneMap.get(cleanPhone);
        if (!existingUser) existingUser = phoneMap.get(`+254${cleanPhone.substring(1)}`);
        if (!existingUser) existingUser = phoneMap.get(`254${cleanPhone.substring(1)}`);
        if (!existingUser) existingUser = phoneMap.get(cleanPhone.substring(1));
        if (!existingUser) existingUser = phoneMap.get(`+254${cleanPhone.substring(1).replace(/^0+/, '')}`);
      } else {
        existingUser = phoneMap.get(cleanPhone);
        if (!existingUser) existingUser = phoneMap.get(`0${cleanPhone}`);
        if (!existingUser) existingUser = phoneMap.get(`+254${cleanPhone}`);
        if (!existingUser) existingUser = phoneMap.get(`254${cleanPhone}`);
        if (!existingUser) existingUser = phoneMap.get(`+254${cleanPhone.replace(/^0+/, '')}`);
      }
      
           if (existingUser) {
        entry.existingUser = existingUser;
        entry.isAutoFilled = true;
        entry.fullName = existingUser.fullName || entry.fullName;
        entry.role = existingUser.role || entry.role;
        entry.membershipNumber = existingUser.membership_number || entry.membershipNumber;
      }
    }
    
    parsed.push(entry);
  }
  
  setBulkPreview(parsed);
}, [bulkData, phoneMap]);
  
  // 🔥 DEBOUNCED preview update - only updates after typing stops
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Set new timer - wait 300ms after typing stops
    debounceTimer.current = setTimeout(() => {
      if (bulkData) {
        parseBulkData();
      } else {
        setBulkPreview([]);
      }
    }, 300);
    
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [bulkData, parseBulkData]);
  
// ============ HANDLE BULK ADD (USING BATCH ENDPOINT) ============
const handleBulkAdd = async () => {
  if (bulkPreview.length === 0) {
    alert('Please enter at least one name');
    return;
  }
  
  const validEntries = bulkPreview.filter(item => item.valid && item.fullName);
  if (validEntries.length === 0) {
    alert('No valid entries found');
    return;
  }
  
  if (!confirm(`Add ${validEntries.length} members to this meeting?`)) {
    return;
  }
  
  setLoading(true);
  setBulkProgress(0);
  setIsAdding(true);
  
  const token = localStorage.getItem('token');
  
  try {
    // ✅ Build the users array for batch
    const users = [];
    let autoFilledCount = 0;
    
    // Show progress for processing
    setBulkProgress(10);
    
    for (const entry of validEntries) {
      let userData = {
        fullName: entry.fullName,
        phoneNumber: entry.phoneNumber || null,
        role: entry.role === 'Guest' || entry.role === 'guest' ? 'Guest' : entry.role || 'Guest',
        specialRole: null,
        membershipNumber: entry.membershipNumber || null,
        jumuiaId: null,
        jumuiaName: null,
        notes: 'Bulk added via textarea'
      };
      
      // 🔥 INSTANT O(1) lookup - NO API CALL!
      if (entry.phoneNumber && phoneMap.size > 0) {
        const existingUser = phoneMap.get(entry.phoneNumber);
        if (existingUser) {
          userData = {
            fullName: existingUser.fullName || entry.fullName,
            phoneNumber: existingUser.phone || entry.phoneNumber,
            role: existingUser.role || 'member',
            specialRole: existingUser.specialRole || null,
            membershipNumber: existingUser.membership_number || null,
            jumuiaId: existingUser.jumuiaId || null,
            jumuiaName: existingUser.homeJumuia?.name || null,
            notes: `Auto-filled from existing user (${entry.fullName})`
          };
          autoFilledCount++;
        }
      }
      
      users.push(userData);
    }
    
    // Update progress to 30% after processing
    setBulkProgress(30);
    
    // ✅ ONE API CALL for ALL members with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      // Simulate progress during API call (stop at 95%)
      const progressInterval = setInterval(() => {
        setBulkProgress(prev => {
          if (prev < 95) return prev + 5;
          return prev;
        });
      }, 500);
      
      const response = await api.post(
        `/api/attendance/sheet/${sheetId}/entries/batch`,
        { users },
        { 
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        }
      );
      
      clearInterval(progressInterval);
      clearTimeout(timeoutId);
      
      const { count, entries } = response.data;
      
      // Immediately set to 100% when done
      setBulkProgress(100);
      
      // Small delay so user sees 100%
      await new Promise(resolve => setTimeout(resolve, 300));
      
      let message = `✅ Added: ${count} members successfully!`;
      if (autoFilledCount > 0) {
        message += `\n🔄 Auto-filled: ${autoFilledCount} existing users`;
      }
      alert(message);
      
      localStorage.removeItem(DRAFT_KEY);
      setBulkData('');
      setBulkPreview([]);
      navigate(`${basePath}/attendance`);
      
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        alert('⏱️ Request timed out. Please try again with fewer members.');
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('Bulk add error:', error);
    alert(error.response?.data?.error || 'Failed to add members');
  } finally {
    setLoading(false);
    setBulkProgress(0);
    setIsAdding(false);
  }
};
  // ============ HANDLE SUBMIT (Single) ============
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fullName) {
      alert('Please enter full name');
      return;
    }
    
    setLoading(true);
    try {
      const submitData = {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber || null,
        role: formData.role === 'Guest' ? 'Guest' : formData.role,
        specialRole: formData.specialRole || null,
        membershipNumber: formData.membershipNumber || null,
        jumuiaId: formData.jumuiaId || null,
        jumuiaName: formData.jumuiaName || null,
        signTime: formData.signTime || new Date().toISOString(),
        notes: formData.notes || null
      };
      
      const token = localStorage.getItem('token');
      await api.post(`/api/attendance/sheet/${sheetId}/entry`, submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      localStorage.removeItem(DRAFT_KEY);
      alert('✅ Member added successfully!');
      navigate(`${basePath}/attendance`);
    } catch (error) {
      console.error('Error adding member:', error);
      alert(error.response?.data?.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };
  
  // ============ ROLE OPTIONS ============
  const roleOptions = [
    { value: 'member', label: 'Member' },
    { value: 'admin', label: 'Admin' },
    { value: 'jumuia_leader', label: 'Jumuia Leader' },
    { value: 'treasurer', label: 'Treasurer' },
    { value: 'secretary', label: 'Secretary' },
    { value: 'choir_moderator', label: 'Choir Moderator' },
    { value: 'media_moderator', label: 'Media Moderator' },
    { value: 'Guest', label: 'Guest (Not in System)' }
  ];
  
  // ============ SPECIAL ROLE OPTIONS ============
  const specialRoleOptions = [
    { value: '', label: 'None' },
    { value: 'chairperson', label: 'Chairperson' },
    { value: 'secretary', label: 'Secretary' },
    { value: 'treasurer', label: 'Treasurer' },
    { value: 'jumuia_leader', label: 'Jumuia Leader' },
    { value: 'choir_moderator', label: 'Choir Moderator' },
    { value: 'media_moderator', label: 'Media Moderator' }
  ];
  
  return (
    <div className="page-container" onClick={(e) => e.stopPropagation()}>
      {/* Toast */}
      {showToast && (
        <div className={`toast ${toastType}`}>
          {toastMessage}
        </div>
      )}
      
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate(`${basePath}/attendance`)}>
            <ArrowLeft size={20} /> Back
          </button>
          <h2>Add Member to Attendance</h2>
        </div>
        <div className="header-right">
          {lastSaved && (
            <span className="last-saved">💾 Saved {new Date(lastSaved).toLocaleTimeString()}</span>
          )}
          <button className="clear-btn-header" onClick={clearDraft}>
            <X size={16} /> Clear Draft
          </button>
        </div>
      </div>
      
      {/* Mode Toggle Buttons */}
      <div className="mode-toggle">
        <button 
          type="button"
          className={`mode-btn ${!isBulkMode ? 'active' : ''}`}
          onClick={() => setIsBulkMode(false)}
        >
          <Plus size={16} />
          Add One by One
        </button>
        <button 
          type="button"
          className={`mode-btn ${isBulkMode ? 'active' : ''}`}
          onClick={() => setIsBulkMode(true)}
        >
          <List size={16} />
          Bulk Add Multiple
        </button>
      </div>
      
      {/* BULK ADD MODE */}
      {isBulkMode && (
        <div className="bulk-section">
          <div className="bulk-header">
            <Upload size={16} />
            <span><FaUsers /> Bulk Add Multiple Members</span>
          </div>
         <div className="bulk-help">
  <p><strong>Format options:</strong></p>
  <ul>
    <li><code>Name, Phone,</code> - All fields</li>
    <li><code>TONNIE KIRIMI, 0712345678</code></li>
  </ul>
  <p><em> <span style={{ color: '#000000', fontWeight: 'bold' }}>Tip: If you already have a ZUCA account use correct names and you'll automatically be identified on the suggestion list!</span></em></p>

   <p><span style={{ color: '#003cff', fontWeight: 'bold' }}><strong>⚠️ NUMBERING IS AUTOMATIC!.</strong></span></p>
  
  <p><span style={{ color: '#ff1100', fontWeight: 'bold' }}><strong>⚠️ STRICTLY USE THE PHONE NUMBER YOU USED TO CREATE YOUR ZUCA ACCOUNT WITH.</strong></span></p>

</div>

{/* Suggestion Dropdown - Now positioned below the help text */}
{showSuggestions && suggestions.length > 0 && (
  <div 
    className="suggestions-dropdown"
  >
    <div className="suggestions-header">
      
    <span style={{ color: '#0ca307', fontWeight: 'bold' }}>Hey there! 😀 <strong>I  already know Your name: </strong></span>
  <span style={{ color: '#ff1100', fontWeight: 'bold' }}> -💡- <strong>PLEASE TAP YOUR NAME TO AUTOFILL!</strong></span>
</div>
    {suggestions.map((user) => (
      <div 
        key={user.id}
        className="suggestion-item"
        onClick={() => {
          // Get current text and cursor position
          const textarea = document.querySelector('.bulk-textarea-large');
          if (!textarea) return;
          
          const cursorPos = textarea.selectionStart;
          const beforeCursor = bulkData.substring(0, cursorPos);
          const afterCursor = bulkData.substring(cursorPos);
          const lines = beforeCursor.split('\n');
          const currentLineIndex = lines.length - 1;
          const currentLine = lines[currentLineIndex] || '';
          
          // Get the prefix (number part) and clean the line
          const numberMatch = currentLine.match(/^(\d+[\.\)]\s*)/);
          const prefix = numberMatch ? numberMatch[1] : '';
          
          // Create the new line with suggestion (keeps numbering, adds phone)
          const phonePart = user.phone ? ` ${user.phone}` : '';
          const newLine = `${prefix}${user.fullName}${phonePart}`;
          lines[currentLineIndex] = newLine;
          const newText = lines.join('\n') + (afterCursor ? '\n' + afterCursor : '');
          
          setBulkData(newText);
          setShowSuggestions(false);
          setSuggestions([]);
          
          // Focus back on textarea
          textarea.focus();
        }}
      >
        <span className="suggestion-name">👤 {user.fullName}</span>
        {user.phone && <span className="suggestion-phone">📞 {user.phone}</span>}
        {user.membershipNumber && <span className="suggestion-membership">🆔 {user.membershipNumber}</span>}
      </div>
    ))}
  </div>
)}
          
       <textarea
  className="bulk-textarea-large"
  placeholder={`Example:
Christopher Mark, 0712345678, Guest, Z#001, 2024-01-15 14:30
`}
  rows="8"
  value={bulkData}
  onChange={(e) => {
  let newValue = e.target.value;
  const cursorPos = e.target.selectionStart;
  
  // Check if user is deleting (backspace or delete)
  const isDeleting = newValue.length < bulkData.length;
  
  // Convert the current line to uppercase
  const beforeCursor = newValue.substring(0, cursorPos);
  const afterCursor = newValue.substring(cursorPos);
  const lines = beforeCursor.split('\n');
  const currentLineIndex = lines.length - 1;
  const currentLine = lines[currentLineIndex] || '';
  
  // Get the prefix (number part) and the text part
  const numberMatch = currentLine.match(/^(\d+[\.\)]\s*)/);
  const prefix = numberMatch ? numberMatch[1] : '';
  const textPart = currentLine.substring(prefix.length);
  
  // Convert text part to uppercase (only if not deleting)
  let upperTextPart = textPart;
  if (!isDeleting) {
    upperTextPart = textPart.toUpperCase();
  }
  const newCurrentLine = prefix + upperTextPart;
  
  // Get suggestions based on what user is typing (remove number prefix)
  const cleanText = textPart.toUpperCase().trim();
  if (cleanText.length >= 2 && !isDeleting) {
    getNameSuggestions(cleanText);
  } else {
    setSuggestions([]);
    setShowSuggestions(false);
  }
  
  // Reconstruct the full text
  lines[currentLineIndex] = newCurrentLine;
  let newText = lines.join('\n') + afterCursor;
  
  // If user is deleting, just set the text without renumbering
  if (isDeleting) {
    setBulkData(newText);
    return;
  }
  
  // Handle numbering on Enter
  const allLines = newText.split('\n');
  const lastLine = allLines[allLines.length - 1] || '';
  
  if (lastLine === '' && allLines.length > 1) {
    // User pressed Enter - number everything and add next number
    let numbered = autoNumberBulkData(newText);
    
    // Count how many lines have content
    const contentLines = numbered.split('\n').filter(line => line.trim() !== '');
    const nextNumber = contentLines.length + 1;
    
    // Add the next number on a new empty line
    numbered = numbered + `\n${nextNumber}. `;
    
    setBulkData(numbered);
    setShowSuggestions(false);
    
    // Focus and set cursor at the end (after the new number)
    setTimeout(() => {
      const textarea = e.target;
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = numbered.length;
    }, 10);
  } else {
    setBulkData(newText);
  }
}}
  onBlur={() => {
  // When user clicks away, convert to uppercase and renumber
  if (bulkData.trim()) {
    // First convert all text to uppercase (except phone numbers)
    const lines = bulkData.split('\n');
    const upperLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      
      // Keep the number prefix
      const numberMatch = trimmed.match(/^(\d+[\.\)]\s*)/);
      const prefix = numberMatch ? numberMatch[1] : '';
      const textPart = trimmed.substring(prefix.length);
      
      // Convert text part to uppercase
      return prefix + textPart.toUpperCase();
    });
    
    const upperText = upperLines.join('\n');
    const numbered = autoNumberBulkData(upperText);
    setBulkData(numbered);
  }
}}
/>



          
                    {bulkPreview.length > 0 && (
            <div className="bulk-preview">
              <div className="preview-title">📋 Preview ({bulkPreview.length} members):</div>
              <div className="preview-list">
              {bulkPreview.map((item, idx) => (
  <div key={idx} className={`preview-item ${!item.valid ? 'invalid' : ''}`}>
    <span className="preview-name">
      {item.fullName || '❌ Invalid'}
      {item.isAutoFilled && item.existingUser && (
        <span className="auto-filled-badge">🔄 Existing</span>
      )}
    </span>
    <span className="preview-phone">{item.phoneNumber || 'No phone'}</span>
    <span className="preview-role">{item.role || 'Guest'}</span>
    {item.membershipNumber && <span className="preview-membership">🆔 {item.membershipNumber}</span>}
    {item.signTime && <span className="preview-time">🕐 {item.signTime}</span>}
  </div>
))}
              </div>
            </div>
          )}
          
        {/* Progress Bar - Inline Styles */}
{isAdding && (
  <div style={{
    margin: '12px 0 8px 0',
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '6px'
    }}>
      <span style={{ fontSize: '12px', color: '#475569' }}>
        {bulkProgress < 30 ? '📝 Processing members...' : 
         bulkProgress < 90 ? '📤 Adding members...' : 
         '✅ Almost done!'}
      </span>
      <span style={{ 
        fontWeight: 'bold', 
        color: '#166534', 
        fontSize: '14px' 
      }}>
        {bulkProgress}%
      </span>
    </div>
    <div style={{
      width: '100%',
      height: '8px',
      background: '#e2e8f0',
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      <div style={{
        width: `${bulkProgress}%`,
        height: '100%',
        background: 'linear-gradient(90deg, #166534, #22c55e)',
        borderRadius: '4px',
        transition: 'width 0.5s ease',
        minWidth: '2%'
      }}></div>
    </div>
  </div>
)}
          
          <button 
            type="button" 
            className="bulk-add-btn"
            onClick={handleBulkAdd}
            disabled={loading || bulkPreview.length === 0}
          >
            <Users size={16} />
            {loading ? `Adding... ${bulkProgress}%` : `Add All (${bulkPreview.length}) Members`}
          </button>
        </div>
      )}
      
      {/* SINGLE ADD MODE */}
      {!isBulkMode && (
        <>
          {/* Search Result Dropdown */}
          {searchResults.length > 0 && (
            <div className="search-results">
              <div className="search-title">Found existing users:</div>
              {searchResults.map(user => (
                <div key={user.id} className="search-result-item" onClick={() => selectUser(user)}>
                  <div className="result-info">
                    <div className="result-name">{user.fullName}</div>
                    <div className="result-details">
                      {user.membership_number && <span>🆔 {user.membership_number}</span>}
                      {user.phone && <span>📞 {user.phone}</span>}
                    </div>
                  </div>
                  <button className="select-btn">Select</button>
                </div>
              ))}
            </div>
          )}
          
          {/* Selected User Badge */}
          {selectedUser && (
            <div className="selected-badge">
              <CheckCircle size={16} />
              <span>Selected: {selectedUser.fullName}</span>
              <button onClick={clearSelection} className="clear-btn">Change</button>
            </div>
          )}
          
          {/* Single Add Form */}
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Full Name */}
              <div className="form-group">
                <label><User size={14} /> Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g., John Mwangi"
                  required
                />
              </div>
              
              {/* Phone Number */}
              <div className="form-group">
                <label><Phone size={14} /> Phone Number (Optional)</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="e.g., 0712345678"
                />
                <div className="helper-text">
                  💡 Enter phone number to search for existing member
                </div>
              </div>
              
              {/* Membership Number (Optional) */}
              <div className="form-group">
                <label><Hash size={14} /> Membership Number (Optional)</label>
                <input
                  type="text"
                  name="membershipNumber"
                  value={formData.membershipNumber}
                  onChange={handleChange}
                  placeholder="e.g., Z#001 or leave empty"
                />
              </div>
              
              {/* Role */}
              <div className="form-row">
                <div className="form-group">
                  <label><Briefcase size={14} /> Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                  >
                    {roleOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Special Role</label>
                  <select
                    name="specialRole"
                    value={formData.specialRole}
                    onChange={handleChange}
                  >
                    {specialRoleOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Sign Time (Optional) */}
              <div className="form-group">
                <label><Clock size={14} /> Sign Time (Optional)</label>
                <input
                  type="datetime-local"
                  name="signTime"
                  value={formData.signTime}
                  onChange={handleChange}
                />
                <div className="helper-text">
                  💡 Leave empty to use current time
                </div>
              </div>
              
              {/* Jumuia */}
              <div className="form-row">
                <div className="form-group">
                  <label><Home size={14} /> Jumuia</label>
                  <select
                    name="jumuiaId"
                    value={formData.jumuiaId}
                    onChange={handleChange}
                  >
                    <option value="">None</option>
                    {loadingJumuia ? (
                      <option disabled>Loading...</option>
                    ) : (
                      jumuiaList.map(j => (
                        <option key={j.id} value={j.id}>{j.name}</option>
                      ))
                    )}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Jumuia Name (Custom)</label>
                  <input
                    type="text"
                    name="jumuiaName"
                    value={formData.jumuiaName}
                    onChange={handleChange}
                    placeholder="For guests or custom entry"
                  />
                </div>
              </div>
              
              {/* Notes */}
              <div className="form-group">
                <label><FileText size={14} /> Notes (Optional)</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Any additional notes about this member..."
                  rows="2"
                />
              </div>
            </div>
            
            {/* Footer */}
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-save-draft"
                onClick={() => saveDraft(formData, false)}
              >
                💾 Save Draft
              </button>
              <button type="button" className="btn-secondary" onClick={() => navigate(`${basePath}/attendance`)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </form>
        </>
      )}
      
      <style>{`
        .page-container {
          max-width: 700px;
          margin: 0 auto;
          padding: 24px;
          background: #f5f5f5;
          min-height: 100vh;
        }
        
        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 20px;
          border-radius: 8px;
          z-index: 9999;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideIn 0.3s ease;
        }
        
        .toast.success { background: #dcfce7; color: #166534; }
        .toast.error { background: #fee2e2; color: #991b1b; }
        .toast.info { background: #dbeafe; color: #1e40af; }
        
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: white;
          border-radius: 16px 16px 0 0;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .header-left h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        .back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: 8px;
          color: #666;
          font-size: 14px;
        }
        
        .back-btn:hover {
          background: #f0f0f0;
        }
        
        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .last-saved {
          font-size: 12px;
          color: #22c55e;
          background: #dcfce7;
          padding: 4px 12px;
          border-radius: 20px;
        }
        
        .clear-btn-header {
          display: flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: 1px solid #fee2e2;
          border-radius: 8px;
          color: #dc2626;
          cursor: pointer;
          padding: 6px 12px;
          font-size: 13px;
        }
        
        .clear-btn-header:hover {
          background: #fee2e2;
        }
        
        /* Mode Toggle */
        .mode-toggle {
          display: flex;
          gap: 12px;
          margin: 20px 24px 0;
          background: white;
          padding: 0 24px;
        }
        
        .mode-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: #f1f5f9;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .mode-btn.active {
          background: #1a1a1a;
          border-color: #1a1a1a;
          color: white;
        }
        
        .mode-btn:hover:not(.active) {
          background: #e2e8f0;
        }
        
        /* Bulk Section */
       .bulk-section {
  margin: 20px 24px;
  padding: 20px;
  background: #f0fdf4;
  border-radius: 16px;
  border: 1px solid #bbf7d0;
  position: relative;
}
        
        .bulk-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 16px;
          color: #166534;
          margin-bottom: 16px;
        }
        
        .bulk-help {
          font-size: 12px;
          color: #166534;
          margin-bottom: 16px;
          background: #dcfce7;
          padding: 12px;
          border-radius: 8px;
        }
        
        .bulk-help ul {
          margin: 8px 0;
          padding-left: 20px;
        }
        
        .bulk-help code {
          background: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
        }
        
        .bulk-textarea-large {
          width: 100%;
          padding: 14px;
          border: 1px solid #bbf7d0;
          border-radius: 12px;
          font-size: 13px;
          font-family: 'Courier New', monospace;
          resize: vertical;
          background: white;
          line-height: 1.6;
        }
        
        .bulk-textarea-large:focus {
          outline: none;
          border-color: #166534;
        }
        
        .bulk-preview {
          margin-top: 16px;
          background: white;
          border-radius: 12px;
          padding: 12px;
          max-height: 300px;
          overflow-y: auto;
        }
        
        .preview-title {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #166534;
        }
        
        .preview-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .preview-item {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 11px;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 8px;
          align-items: center;
        }
        
        .preview-item.invalid {
          background: #fee2e2;
          color: #ef4444;
        }
        
        .preview-name {
          font-weight: 600;
          min-width: 120px;
        }
        
        .preview-phone {
          color: #64748b;
          min-width: 100px;
        }
        
        .preview-role {
          color: #3b82f6;
          font-size: 10px;
          background: #eff6ff;
          padding: 2px 6px;
          border-radius: 4px;
        }
        
        .preview-membership {
          color: #8b5cf6;
          font-size: 10px;
        }
        
        .preview-time {
          color: #f59e0b;
          font-size: 10px;
        }
        
        .preview-more {
          font-size: 11px;
          color: #64748b;
          text-align: center;
          padding: 8px;
        }
        
        .bulk-add-btn {
          width: 100%;
          margin-top: 16px;
          padding: 14px;
          background: #166534;
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .bulk-add-btn:hover {
          background: #14532d;
        }
        
        .bulk-add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Search Results */
        .search-results {
          margin: 0 24px 16px;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          overflow: hidden;
          background: white;
        }
        
        .search-title {
          padding: 10px 16px;
          background: #f8f8f8;
          font-size: 12px;
          font-weight: 500;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .search-result-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #f0f0f0;
          cursor: pointer;
        }
        
        .search-result-item:hover {
          background: #f8f8f8;
        }
        
        .result-name {
          font-weight: 500;
          margin-bottom: 4px;
        }
        
        .result-details {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: #666;
        }
        
        .select-btn {
          padding: 4px 12px;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
        }
        
        .selected-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 24px 16px;
          padding: 10px 16px;
          background: #dcfce7;
          border-radius: 10px;
          font-size: 13px;
        }
        
        .clear-btn {
          margin-left: auto;
          background: none;
          border: none;
          color: #22c55e;
          cursor: pointer;
          font-size: 12px;
          text-decoration: underline;
        }
        
        .modal-body {
          background: white;
          padding: 20px 24px;
        }
        
        .form-group {
          margin-bottom: 18px;
        }
        
        .form-group label {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          font-weight: 500;
          font-size: 13px;
          color: #1a1a1a;
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
        }
        
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #1a1a1a;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        
        .helper-text {
          font-size: 11px;
          color: #666;
          margin-top: 6px;
        }
        
        textarea {
          resize: vertical;
        }
        
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          background: white;
          border-top: 1px solid #e0e0e0;
          border-radius: 0 0 16px 16px;
        }
        
        .btn-secondary {
          padding: 10px 20px;
          background: #f0f0f0;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .btn-secondary:hover {
          background: #e0e0e0;
        }
        
        .btn-save-draft {
          padding: 10px 20px;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #92400e;
        }
        
        .btn-save-draft:hover {
          background: #fde68a;
        }
        
        .btn-primary {
          padding: 10px 20px;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .btn-primary:hover:not(:disabled) {
          background: #333;
        }
        
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        /* Auto-fill styles */
        .auto-filled-badge {
          font-size: 9px;
          background: #dbeafe;
          color: #1e40af;
          padding: 2px 8px;
          border-radius: 12px;
          margin-left: 6px;
        }


        /* Suggestion Dropdown */
.suggestions-dropdown {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  max-height: 200px;
  overflow-y: auto;
  padding: 8px 0;
  animation: slideUp 0.2s ease;
  margin-top: 8px;
  margin-bottom: 8px;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.suggestions-header {
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 4px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 13px;
}

.suggestion-item:hover {
  background: #f0fdf4;
}

.suggestion-name {
  font-weight: 500;
  color: #1a1a1a;
  min-width: 120px;
}

.suggestion-phone {
  color: #64748b;
  font-size: 12px;
}

.suggestion-membership {
  color: #8b5cf6;
  font-size: 11px;
  background: #f3f0ff;
  padding: 2px 8px;
  border-radius: 12px;
}

.suggestions-dropdown::-webkit-scrollbar {
  width: 6px;
}

.suggestions-dropdown::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.suggestions-dropdown::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.suggestions-dropdown::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Progress Bar */
.progress-container {
  margin: 12px 0 8px 0;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.progress-bar-wrapper {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #166534, #22c55e);
  border-radius: 4px;
  transition: width 0.5s ease;
  position: relative;
  min-width: 2%;
}

.progress-bar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.progress-text {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
  font-size: 12px;
  color: #475569;
}

.progress-percent {
  font-weight: 600;
  color: #166534;
  font-size: 13px;
}
        
        @media (max-width: 768px) {
          .page-container { padding: 12px; }
          .page-header { flex-wrap: wrap; gap: 8px; }
          .form-row { grid-template-columns: 1fr; }
          .modal-footer { flex-wrap: wrap; }
          .modal-footer button { flex: 1; }
          .mode-toggle { flex-direction: column; padding: 0 12px; }
          .bulk-section { margin: 12px; }
        }
      `}</style>
    </div>
  );
}