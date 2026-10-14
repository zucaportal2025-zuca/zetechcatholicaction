// frontend/src/pages/treasurer/TreasurerReports.jsx
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Calendar, FileText, Download, Printer } from 'lucide-react';
import axios from "axios";
import * as XLSX from 'xlsx';
import BASE_URL from "../../api";
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';

// Skeleton Loader Component
const SkeletonLoader = () => (
  <div className="skeleton-wrapper">
    <div className="skeleton-header">
      <div className="skeleton-back-btn"></div>
      <div className="skeleton-refresh-btn"></div>
    </div>
    <div className="skeleton-stats-grid">
      <div className="skeleton-stat-card"></div>
      <div className="skeleton-stat-card"></div>
      <div className="skeleton-stat-card"></div>
    </div>
    <div className="skeleton-tabs">
      <div className="skeleton-tab"></div>
      <div className="skeleton-tab"></div>
      <div className="skeleton-tab"></div>
      <div className="skeleton-tab"></div>
    </div>
    <div className="skeleton-table">
      <div className="skeleton-row"></div>
      <div className="skeleton-row"></div>
      <div className="skeleton-row"></div>
      <div className="skeleton-row"></div>
    </div>
  </div>
);

export default function TreasurerReports() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("ledger");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [members, setMembers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Report tab state
  const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  
  const [campaignSummary, setCampaignSummary] = useState({
    totalCampaigns: 0,
    totalCollected: 0,
    totalPending: 0,
    totalTarget: 0,
    overallCompletion: 0,
    activeCampaigns: 0,
    completedCampaigns: 0
  });
  const [ledgerSummary, setLedgerSummary] = useState({
    totalIn: 0,
    totalOut: 0,
    balance: 0,
    count: 0
  });
  
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    description: "",
    category: "",
    type: "IN",
    amount: "",
    reference: "",
    notes: ""
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [inAmount, setInAmount] = useState("");
  const [outAmount, setOutAmount] = useState("");

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  
  const inCategories = ["Contributions", "Registration", "Sponsors", "Events", "Other Income"];
  const outCategories = ["Choir Expenses", "Events", "Maintenance", "Supplies", "Other Expense"];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    try {
      const [campaignsRes, membersRes, ledgerRes, auditRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/treasurer/campaign-summary`, { headers }),
        axios.get(`${BASE_URL}/api/treasurer/member-summary`, { headers }),
        axios.get(`${BASE_URL}/api/treasurer/ledger`, { headers }),
        axios.get(`${BASE_URL}/api/treasurer/audit-trail`, { headers })
      ]);
      
      if (campaignsRes.data.success) {
        setCampaigns(campaignsRes.data.campaigns || []);
        setCampaignSummary(campaignsRes.data.summary || {
          totalCampaigns: 0, totalCollected: 0, totalPending: 0,
          totalTarget: 0, overallCompletion: 0, activeCampaigns: 0, completedCampaigns: 0
        });
      }
      
      if (membersRes.data.success) setMembers(membersRes.data.members || []);
      if (ledgerRes.data.success) {
        setTransactions(ledgerRes.data.transactions || []);
        setLedgerSummary(ledgerRes.data.summary || { totalIn: 0, totalOut: 0, balance: 0, count: 0 });
      }
      if (auditRes.data.success) setAuditLogs(auditRes.data.auditLogs || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, []);

  // Generate Report
  const generateReport = useCallback(async () => {
    if (!reportStartDate || !reportEndDate) {
      showToast("Please select both start and end dates", "error");
      return;
    }

    setGeneratingReport(true);
    
    try {
      const response = await axios.get(`${BASE_URL}/api/treasurer/ledger`, { headers });
      if (response.data.success) {
        const allTransactions = response.data.transactions;
        
        // Filter transactions by date range
        const filtered = allTransactions.filter(t => {
          const tDate = new Date(t.date).toISOString().split('T')[0];
          return tDate >= reportStartDate && tDate <= reportEndDate;
        });
        
        // Calculate totals
        const totalIn = filtered.filter(t => t.type === "IN").reduce((sum, t) => sum + t.amount, 0);
        const totalOut = filtered.filter(t => t.type === "OUT").reduce((sum, t) => sum + t.amount, 0);
        const balance = totalIn - totalOut;
        
        // Group by category
        const incomeByCategory = {};
        const expenseByCategory = {};
        
        filtered.forEach(t => {
          if (t.type === "IN") {
            incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
          } else {
            expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
          }
        });
        
        setReportData({
          startDate: reportStartDate,
          endDate: reportEndDate,
          transactions: filtered,
          totalIn,
          totalOut,
          balance,
          incomeByCategory,
          expenseByCategory,
          transactionCount: filtered.length,
          generatedOn: new Date().toLocaleString()
        });
        
        showToast("Report generated successfully!");
      }
    } catch (err) {
      console.error("Error generating report:", err);
      showToast("Failed to generate report", "error");
    } finally {
      setGeneratingReport(false);
    }
  }, [reportStartDate, reportEndDate]);

  // Export Report as Word/Text Document
  const exportReportAsPDF = () => {
  if (!reportData) return;
  const element = document.getElementById('report-content-for-export');
  if (!element) return;
  
  const opt = {
    margin: [0.5, 0.5, 0.5, 0.5],
    filename: `ZUCA_Financial_Report_${reportData.startDate}_to_${reportData.endDate}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, letterRendering: true },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };
  
  html2pdf().set(opt).from(element).save();
  showToast("PDF downloaded!");
};

const exportReportAsWord = () => {
  if (!reportData) return;
  const element = document.getElementById('report-content-for-export');
  if (!element) return;
  
  const styles = document.createElement('style');
  styles.textContent = `
    body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; }
    .report-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
    .report-header h2 { font-size: 24px; margin-bottom: 5px; }
    .report-summary { display: flex; justify-content: space-between; margin: 20px 0; }
    .summary-card { background: #f5f5f5; padding: 15px; text-align: center; border-radius: 8px; flex: 1; margin: 0 10px; }
    .summary-amount { font-size: 24px; font-weight: bold; }
    .summary-card.income .summary-amount { color: #28a745; }
    .summary-card.expense .summary-amount { color: #dc3545; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f2f2f2; }
    .transaction-item.in { background: #d4edda; }
    .transaction-item.out { background: #f8d7da; }
    .footer { margin-top: 50px; text-align: center; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
  `;
  
  const clone = element.cloneNode(true);
  clone.prepend(styles);
  
  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>ZUCA Financial Report</title>
  </head>
  <body>
    ${clone.innerHTML}
  </body>
  </html>`;
  
  const blob = new Blob([html], { type: 'application/msword' });
  saveAs(blob, `ZUCA_Financial_Report_${reportData.startDate}_to_${reportData.endDate}.doc`);
  showToast("Word document downloaded!");
};

  const getRunningBalance = () => {
    let balance = 0;
    return [...transactions]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(t => {
        if (t.type === "IN") balance += Number(t.amount);
        else balance -= Number(t.amount);
        return { ...t, runningBalance: balance };
      });
  };

  const transactionsWithBalance = getRunningBalance();

  const filteredTransactions = transactionsWithBalance.filter(t => {
    if (dateRange.start && new Date(t.date) < new Date(dateRange.start)) return false;
    if (dateRange.end && new Date(t.date) > new Date(dateRange.end)) return false;
    if (searchTerm && !t.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const totalMoneyIn = filteredTransactions.filter(t => t.type === "IN").reduce((sum, t) => sum + Number(t.amount), 0);
  const totalMoneyOut = filteredTransactions.filter(t => t.type === "OUT").reduce((sum, t) => sum + Number(t.amount), 0);
  const currentBalance = filteredTransactions.length > 0 ? filteredTransactions[filteredTransactions.length - 1].runningBalance : ledgerSummary.balance;

  const handleAmountChange = (value) => {
    if (newTransaction.type === "IN") {
      setInAmount(value);
      setNewTransaction({ ...newTransaction, amount: value });
    } else {
      setOutAmount(value);
      setNewTransaction({ ...newTransaction, amount: value });
    }
  };

  const handleTypeChange = (type) => {
    let amount = "";
    if (type === "IN") {
      amount = inAmount;
    } else {
      amount = outAmount;
    }
    
    setNewTransaction({ 
      ...newTransaction, 
      type: type, 
      category: type === "IN" ? inCategories[0] : outCategories[0],
      amount: amount 
    });
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.description || !newTransaction.amount || !newTransaction.category) {
      showToast("Please fill all required fields", "error");
      return;
    }

    const amountNum = parseFloat(newTransaction.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast("Please enter a valid amount greater than 0", "error");
      return;
    }

    setIsSaving(true);

    try {
      const response = await axios.post(`${BASE_URL}/api/treasurer/ledger`, {
        ...newTransaction,
        amount: amountNum
      }, { headers });
      
      if (response.data.success) {
        await refreshData();
        setNewTransaction({
          date: new Date().toISOString().split('T')[0],
          description: "",
          category: newTransaction.type === "IN" ? inCategories[0] : outCategories[0],
          type: newTransaction.type,
          amount: "",
          reference: "",
          notes: ""
        });
        setInAmount("");
        setOutAmount("");
        setShowAddTransaction(false);
        showToast("Transaction added successfully");
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to add transaction", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    const amount = transaction.amount.toString();
    
    if (transaction.type === "IN") {
      setInAmount(amount);
      setOutAmount("");
    } else {
      setOutAmount(amount);
      setInAmount("");
    }
    
    setNewTransaction({
      date: transaction.date.split('T')[0] || transaction.date,
      description: transaction.description,
      category: transaction.category,
      type: transaction.type,
      amount: amount,
      reference: transaction.reference || "",
      notes: transaction.notes || ""
    });
    setShowAddTransaction(true);
  };

  const handleUpdateTransaction = async () => {
    if (!editingTransaction) return;
    
    if (!newTransaction.amount || parseFloat(newTransaction.amount) <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }

    setIsUpdating(true);
    
    try {
      const response = await axios.put(`${BASE_URL}/api/treasurer/ledger/${editingTransaction.id}`, {
        ...newTransaction,
        amount: parseFloat(newTransaction.amount)
      }, { headers });
      
      if (response.data.success) {
        await refreshData();
        setEditingTransaction(null);
        setShowAddTransaction(false);
        setNewTransaction({
          date: new Date().toISOString().split('T')[0],
          description: "",
          category: "Contributions",
          type: "IN",
          amount: "",
          reference: "",
          notes: ""
        });
        setInAmount("");
        setOutAmount("");
        showToast("Transaction updated successfully");
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to update transaction", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    
    setIsDeleting(true);
    
    try {
      const response = await axios.delete(`${BASE_URL}/api/treasurer/ledger/${id}`, { headers });
      if (response.data.success) {
        await refreshData();
        showToast("Transaction deleted successfully");
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to delete transaction", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const exportToExcel = (data, filename, sheetName) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportLedger = () => {
    const exportData = filteredTransactions.map(t => ({
      "Date": new Date(t.date).toLocaleDateString(),
      "Description": t.description,
      "Category": t.category,
      "Money IN": t.type === "IN" ? t.amount : "-",
      "Money OUT": t.type === "OUT" ? t.amount : "-",
      "Balance": t.runningBalance,
      "Reference": t.reference || ""
    }));
    exportToExcel(exportData, `treasurer_ledger_${new Date().toISOString().split('T')[0]}`, "Ledger");
    showToast("Ledger exported successfully");
  };

  const exportCampaigns = () => {
    const campaignStats = campaigns.map(campaign => ({
      Campaign: campaign.title,
      "Target (KES)": campaign.target,
      "Collected (KES)": campaign.collected,
      "Pending (KES)": campaign.pending,
      "Paid Members": campaign.paidMembers,
      "Total Members": campaign.totalMembers,
      "Completion %": campaign.completion?.toFixed(1) || 0,
      Status: campaign.status
    }));
    exportToExcel(campaignStats, `campaign_report_${new Date().toISOString().split('T')[0]}`, "Campaigns");
    showToast("Campaign report exported successfully");
  };

  const exportMembers = () => {
    const exportData = members.map(m => ({
      Name: m.name,
      "Membership #": m.membershipNumber || "-",
      Jumuia: m.jumuia,
      "Total Paid (KES)": m.total_paid,
      "Total Pending (KES)": m.total_pending,
      "Campaigns Participated": m.campaigns_participated,
      Status: m.status
    }));
    exportToExcel(exportData, `member_report_${new Date().toISOString().split('T')[0]}`, "Members");
    showToast("Member report exported successfully");
  };

  if (loading) {
    return (
      <div className="treasurer-reports-page">
        <SkeletonLoader />
        <style>{`
          .treasurer-reports-page { padding: 24px; background: #f8fafc; min-height: auto; }
          .skeleton-wrapper { max-width: auto; margin: 0 auto; }
          .skeleton-header { display: flex; justify-content: space-between; margin-bottom: 24px; }
          .skeleton-back-btn, .skeleton-refresh-btn { width: 100px; height: 40px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 8px; }
          .skeleton-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
          .skeleton-stat-card { background: white; border-radius: 12px; padding: 20px; border: 1px solid #e0e0e0; }
          .skeleton-stat-value { width: 80px; height: 32px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 6px; margin: 0 auto 8px; }
          .skeleton-stat-label { width: 100px; height: 14px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 4px; margin: 0 auto; }
          .skeleton-tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px; }
          .skeleton-tab { width: 120px; height: 40px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 8px; }
          .skeleton-table { background: white; border-radius: 12px; overflow: hidden; }
          .skeleton-row { height: 50px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 8px; margin-bottom: 10px; }
          @keyframes skeleton-wave { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
          @media (max-width: 768px) { .skeleton-stats-grid { grid-template-columns: 1fr; } .skeleton-tab { width: 80px; height: 35px; } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="treasurer-reports">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <button className="refresh-btn" onClick={refreshData} disabled={refreshing}>
          <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="reports-header">
        <h1>ZUCA Treasury Reports</h1>
        <p>All cash flow,  campaigns, and  member contributions</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card in">
          <div className="stat-icon">↳</div>
          <div className="stat-info">
            <span className="stat-value">KES {totalMoneyIn.toLocaleString()}</span>
            <span className="stat-label">Total Money IN</span>
          </div>
        </div>
        <div className="stat-card out">
          <div className="stat-icon">⤵︎</div>
          <div className="stat-info">
            <span className="stat-value">KES {totalMoneyOut.toLocaleString()}</span>
            <span className="stat-label">Total Money OUT</span>
          </div>
        </div>
        <div className="stat-card balance">
          <div className="stat-icon">✓</div>
          <div className="stat-info">
            <span className="stat-value">KES {currentBalance.toLocaleString()}</span>
            <span className="stat-label">Current Balance</span>
          </div>
        </div>
      </div>

      <div className="tab-navigation">
        <button className={`tab-btn ${activeTab === "ledger" ? "active" : ""}`} onClick={() => setActiveTab("ledger")}>
          <span>📒</span> Cash Ledger
        </button>
        <button className={`tab-btn ${activeTab === "report" ? "active" : ""}`} onClick={() => setActiveTab("report")}>
          <span>📄</span> Financial Report
        </button>
        <button className={`tab-btn ${activeTab === "campaigns" ? "active" : ""}`} onClick={() => setActiveTab("campaigns")}>
          <span>📊</span> Activity & Audit Trail
        </button>
        <button className={`tab-btn ${activeTab === "members" ? "active" : ""}`} onClick={() => setActiveTab("members")}>
          <span>👥</span> Member Contributions
        </button>
      </div>

      {/* LEDGER TAB */}
      {activeTab === "ledger" && (
        <div className="ledger-tab">
          <div className="ledger-actions">
            <div className="ledger-filters">
              <input type="date" className="filter-input" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
              <span>to</span>
              <input type="date" className="filter-input" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
              <input type="text" className="filter-input" placeholder="Search transactions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="ledger-buttons">
              <button className="btn-add" onClick={() => setShowAddTransaction(true)}>➕ Add Transaction</button>
              <button className="btn-export" onClick={exportLedger}>📎 Export Ledger</button>
            </div>
          </div>

          <div className="ledger-table-container">
            {isMobile ? (
              <div className="mobile-cards">
                {filteredTransactions.length === 0 ? (
                  <div className="empty-row">No transactions found</div>
                ) : (
                  filteredTransactions.map((t) => (
                    <div key={t.id} className={`mobile-card ${t.type === "IN" ? "in-card" : "out-card"}`}>
                      <div className="card-header">
                        <span className="card-date">{new Date(t.date).toLocaleDateString()}</span>
                        <div className="card-actions-mobile">
                          <button className="edit-btn" onClick={() => handleEditTransaction(t)} disabled={isDeleting}>✏️</button>
                          <button className="delete-btn" onClick={() => handleDeleteTransaction(t.id)} disabled={isDeleting}>
                            {isDeleting ? "⏳" : "🗑️"}
                          </button>
                        </div>
                      </div>
                      <div className="card-description">{t.description}</div>
                      <div className="card-category">{t.category}</div>
                      <div className="card-amounts">
                        {t.type === "IN" ? (
                          <span className="amount-in">+ KES {t.amount?.toLocaleString()}</span>
                        ) : (
                          <span className="amount-out">- KES {t.amount?.toLocaleString()}</span>
                        )}
                        <span className="card-balance">Balance: KES {t.runningBalance?.toLocaleString()}</span>
                      </div>
                      {t.reference && <div className="card-reference">Ref: {t.reference}</div>}
                      {t.notes && <div className="card-notes">📝 {t.notes}</div>}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <table className="ledger-table">
                <thead>
                  <tr><th>Date</th><th>Description</th><th>Category</th><th>Money IN</th><th>Money OUT</th><th>Balance</th><th>Reference</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr><td colSpan="8" className="empty-row">No transactions found</td></tr>
                  ) : (
                    filteredTransactions.map((t) => (
                      <tr key={t.id} className={t.type === "IN" ? "in-row" : "out-row"}>
                        <td>{new Date(t.date).toLocaleDateString()}</td>
                        <td>{t.description}</td>
                        <td>{t.category}</td>
                        <td className="amount-in">{t.type === "IN" ? `KES ${t.amount?.toLocaleString()}` : "-"}</td>
                        <td className="amount-out">{t.type === "OUT" ? `KES ${t.amount?.toLocaleString()}` : "-"}</td>
                        <td className="amount-balance">KES {t.runningBalance?.toLocaleString()}</td>
                        <td>{t.reference || "-"}</td>
                        <td className="actions">
                          <button className="edit-btn" onClick={() => handleEditTransaction(t)} disabled={isDeleting}>✏️ Edit</button>
                          <button className="delete-btn" onClick={() => handleDeleteTransaction(t.id)} disabled={isDeleting}>
                            {isDeleting ? "⏳ Deleting..." : "🗑️ Delete"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="totals-row">
                    <td colSpan="3"><strong>TOTALS</strong></td>
                    <td className="amount-in"><strong>KES {totalMoneyIn.toLocaleString()}</strong></td>
                    <td className="amount-out"><strong>KES {totalMoneyOut.toLocaleString()}</strong></td>
                    <td className="amount-balance"><strong>KES {currentBalance.toLocaleString()}</strong></td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {/* FINANCIAL REPORT TAB */}
      {activeTab === "report" && (
        <div className="report-tab">
          <div className="report-generator">
            <h3>📅 Generate Financial Report</h3>
            <div className="date-range-selector">
              <div className="date-input-group">
                <label>Start Date</label>
                <input 
                  type="date" 
                  value={reportStartDate} 
                  onChange={(e) => setReportStartDate(e.target.value)}
                />
              </div>
              <div className="date-input-group">
                <label>End Date</label>
                <input 
                  type="date" 
                  value={reportEndDate} 
                  onChange={(e) => setReportEndDate(e.target.value)}
                />
              </div>
              <button 
                className="btn-generate" 
                onClick={generateReport} 
                disabled={generatingReport}
              >
                {generatingReport ? <span className="spinner-small"></span> : <Calendar size={16} />}
                {generatingReport ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </div>

          {reportData && (
            <div className="report-preview">
              <div className="report-actions">
               <button className="btn-export-pdf" onClick={exportReportAsPDF}>
  <Download size={16} /> Download PDF
</button>
<button className="btn-export-word" onClick={exportReportAsWord}>
  <FileText size={16} /> Download Word
</button>
              </div>

              <div id="report-content-for-export" className="report-content">
                <div className="report-header">
                  <h2>ZUCA TREASURY FINANCIAL REPORT</h2>
                  <p>Period: {new Date(reportData.startDate).toLocaleDateString()} - {new Date(reportData.endDate).toLocaleDateString()}</p>
                  <p>Generated: {reportData.generatedOn}</p>
                </div>

                <div className="report-summary">
                  <div className="summary-card income">
                    <div className="summary-icon"></div>
                    <div className="summary-details">
                      <span className="summary-label">  Total Income</span>
                      <span className="summary-amount">  KES {reportData.totalIn.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="summary-card expense">
                    <div className="summary-icon"></div>
                    <div className="summary-details">
                      <span className="summary-label">  Total Expenses</span>
                      <span className="summary-amount">  KES {reportData.totalOut.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className={`summary-card balance ${reportData.balance >= 0 ? 'positive' : 'negative'}`}>
                    <div className="summary-icon"></div>
                    <div className="summary-details">
                      <span className="summary-label"> Net Balance</span>
                      <span className="summary-amount"> KES {reportData.balance.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="report-narrative">
                  <h3> Executive Summary</h3>
                  <p>
                    This financial report covers the period from <strong>{new Date(reportData.startDate).toLocaleDateString()}</strong> 
                    to <strong>{new Date(reportData.endDate).toLocaleDateString()}</strong>. During this period, the treasury processed 
                    <strong> {reportData.transactionCount} transactions</strong>.
                  </p>
                  <p>
                    Total income received was <strong>KES {reportData.totalIn.toLocaleString()}</strong>, 
                    while total expenses incurred were <strong>KES {reportData.totalOut.toLocaleString()}</strong>.
                    This results in a net <strong>{reportData.balance >= 0 ? "surplus" : "deficit"}</strong> of 
                    <strong> KES {Math.abs(reportData.balance).toLocaleString()}</strong>.
                  </p>
                  <p>
                    ZUCA is currently in a <strong>{reportData.balance >= 0 ? "positive" : "negative"}</strong> 
                    financial position with a closing balance of <strong>KES {reportData.balance.toLocaleString()}</strong>.
                  </p>
                </div>

                <div className="report-breakdown">
                  <div className="breakdown-section">
                    <h3>Income by Category</h3>
                    <ul>
                      {Object.entries(reportData.incomeByCategory).map(([cat, amount]) => (
                        <li key={cat}>
                          <span>{cat}</span>
                          <span>KES {amount.toLocaleString()} ({((amount / reportData.totalIn) * 100).toFixed(1)}%)</span>
                        </li>
                      ))}
                    </ul>
                    <div className="breakdown-total">Total: KES {reportData.totalIn.toLocaleString()}</div>
                  </div>
                  <div className="breakdown-section">
                    <h3> Expenses by Category</h3>
                    <ul>
                      {Object.entries(reportData.expenseByCategory).map(([cat, amount]) => (
                        <li key={cat}>
                          <span>{cat}</span>
                          <span>KES {amount.toLocaleString()} ({((amount / reportData.totalOut) * 100).toFixed(1)}%)</span>
                        </li>
                      ))}
                    </ul>
                    <div className="breakdown-total">Total: KES {reportData.totalOut.toLocaleString()}</div>
                  </div>
                </div>

                <div className="report-transactions">
                  <h3> Transaction History</h3>
                  <div className="transactions-list">
                    {reportData.transactions.map((t, idx) => (
                      <div key={idx} className={`transaction-item ${t.type === "IN" ? "in" : "out"}`}>
                        <div className="transaction-date">{new Date(t.date).toLocaleDateString()}</div>
                        <div className="transaction-description">{t.description}</div>
                        <div className="transaction-category">{t.category}</div>
                        <div className={`transaction-amount ${t.type === "IN" ? "in" : "out"}`}>
                          {t.type === "IN" ? "+" : "-"} KES {t.amount.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="report-footer">
                  <p>This is an auto-generated report from ZUCA Portal Treasury System.</p>
                  <p>For any discrepancies, please contact the treasurer immediately.</p>
                  <p>All amounts are in Kenyan Shillings (KES)</p>
                </div>
              </div>
            </div>
          )}

          {!reportData && !generatingReport && (
            <div className="report-placeholder">
              <FileText size={48} />
              <h3>No Report Generated Yet</h3>
              <p>Select a date range and click "Generate Report" to view the financial summary</p>
            </div>
          )}
        </div>
      )}

      {/* ACTIVITY & AUDIT TRAIL TAB */}
      {activeTab === "campaigns" && (
        <div className="audit-tab">
          <div className="audit-header">
            <h2>📝 Ledger Activity & Audit Trail</h2>
            <p>Complete history of all transactions, edits, and deletions</p>
          </div>

          <div className="overall-summary-card">
            <h3> Overall Financial Health</h3>
            <div className="summary-stats">
              <div className="stat-badge in">Total Money IN: KES {totalMoneyIn.toLocaleString()}</div>
              <div className="stat-badge out">Total Money OUT: KES {totalMoneyOut.toLocaleString()}</div>
              <div className="stat-badge balance">Current Balance: KES {currentBalance.toLocaleString()}</div>
            </div>
            <p className="overall-text">
              As of today, the treasury has received a total of <strong>KES {totalMoneyIn.toLocaleString()}</strong> in income 
              and spent <strong>KES {totalMoneyOut.toLocaleString()}</strong> on expenses. 
              The current available balance is <strong>KES {currentBalance.toLocaleString()}</strong>.
              {totalMoneyIn > totalMoneyOut ? " 🎉 ZUCA is in a positive financial position." : " ⚠️ Expenses have exceeded income."}
            </p>
          </div>

          <div className="audit-trail-card">
            <h3>🔒 Audit Trail - Every Change Tracked</h3>
            <p className="audit-warning">⚠️ Every create, edit, and delete operation is logged below.</p>
            
            {auditLogs.length === 0 ? (
              <div className="audit-empty">No changes recorded yet.</div>
            ) : (
              <div className="audit-timeline">
                {auditLogs.map((log, index) => (
                  <motion.div 
                    key={log.id} 
                    className={`audit-item audit-${log.action?.toLowerCase()}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div className="audit-header">
                      <div className="audit-action">
                        {log.action === "CREATE" && "➕ CREATED"}
                        {log.action === "UPDATE" && "✏️ UPDATED"}
                        {log.action === "DELETE" && "🗑️ DELETED"}
                      </div>
                      <div className="audit-time">{new Date(log.timestamp).toLocaleString()}</div>
                    </div>
                    <div className="audit-details">
                      <div className="audit-performed-by">
                        👤 By: <strong>{log.performedByName || "Unknown"}</strong>
                        {log.ipAddress && <span className="audit-ip">📍 IP: {log.ipAddress}</span>}
                      </div>
                      
                      {log.action === "CREATE" && log.newData && (
                        <div className="audit-changes">
                          <div className="change-highlight">Added: <strong>{log.newData.description}</strong></div>
                          <div className="change-details">Amount: KES {log.newData.amount?.toLocaleString()} | Type: {log.newData.type}</div>
                        </div>
                      )}
                      
                      {log.action === "UPDATE" && log.changedFields && log.changedFields.length > 0 && (
                        <div className="audit-changes">
                          <div className="change-warning">⚠️ Changes detected:</div>
                          {log.changedFields.map((change, i) => (
                            <div key={i} className="change-diff">
                              <span className="field-name">{change.field}:</span>
                              <span className="old-value">"{change.oldValue}"</span> → 
                              <span className="new-value">"{change.newValue}"</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {log.action === "DELETE" && log.oldData && (
                        <div className="audit-changes">
                          <div className="change-critical">⚠️ DELETED: {log.oldData.description}</div>
                          <div className="change-details">Amount: KES {log.oldData.amount?.toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="recent-activity-card">
            <h3> Activity Summary</h3>
            <div className="recent-stats">
              <div className="recent-stat"><span className="recent-number">{auditLogs.length}</span><span className="recent-label">Total Actions</span></div>
              <div className="recent-stat"><span className="recent-number">{auditLogs.filter(l => l.action === "CREATE").length}</span><span className="recent-label">Created</span></div>
              <div className="recent-stat"><span className="recent-number">{auditLogs.filter(l => l.action === "UPDATE").length}</span><span className="recent-label">Edits</span></div>
              <div className="recent-stat"><span className="recent-number">{auditLogs.filter(l => l.action === "DELETE").length}</span><span className="recent-label">Deleted</span></div>
            </div>
          </div>
        </div>
      )}

      {/* MEMBER TAB */}
      {activeTab === "members" && (
        <div className="members-tab">
          <div className="member-actions">
            <input type="text" placeholder="Search members..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <button className="btn-export" onClick={exportMembers}>📎 Export Members</button>
          </div>
          <div className="member-table-container">
            {isMobile ? (
              <div className="mobile-cards">
                {members.filter(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase())).map((m) => (
                  <div key={m.id} className="member-mobile-card">
                    <div className="member-name">{m.name}</div>
                    <div>🆔 {m.membershipNumber || "No membership"}</div>
                    <div>🏠 {m.jumuia}</div>
                    <div className="amount-in">💰 Paid: KES {m.total_paid?.toLocaleString()}</div>
                    <div className="amount-out">⏳ Pending: KES {m.total_pending?.toLocaleString()}</div>
                    <span className={`status-badge ${m.status?.toLowerCase()}`}>{m.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <table className="member-table">
                <thead><tr><th>Name</th><th>Membership</th><th>Jumuia</th><th>Paid</th><th>Pending</th><th>Status</th></tr></thead>
                <tbody>
                  {members.filter(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase())).map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{m.membershipNumber || "-"}</td>
                      <td>{m.jumuia}</td>
                      <td className="amount-in">KES {m.total_paid?.toLocaleString()}</td>
                      <td className="amount-out">KES {m.total_pending?.toLocaleString()}</td>
                      <td><span className={`status-badge ${m.status?.toLowerCase()}`}>{m.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showAddTransaction && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowAddTransaction(false); setEditingTransaction(null); }}>
            <motion.div className="modal-content" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()}>
              <h3>{editingTransaction ? "Edit Transaction" : "Add New Transaction"}</h3>
              
              <div className="form-group"><label>Date</label><input type="date" value={newTransaction.date} onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })} /></div>
              <div className="form-group">
                <label>Transaction Type</label>
                <div className="type-buttons">
                  <button className={`type-btn ${newTransaction.type === "IN" ? "active-in" : ""}`} onClick={() => handleTypeChange("IN")}> Money IN</button>
                  <button className={`type-btn ${newTransaction.type === "OUT" ? "active-out" : ""}`} onClick={() => handleTypeChange("OUT")}> Money OUT</button>
                </div>
              </div>
              <div className="form-group"><label>Description</label><input type="text" placeholder="Enter description" value={newTransaction.description} onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })} /></div>
              <div className="form-group">
                <label>Category</label>
                <select value={newTransaction.category} onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}>
                  <option value="">Select category</option>
                  {(newTransaction.type === "IN" ? inCategories : outCategories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Amount (KES)</label><input type="number" placeholder="Enter amount" value={newTransaction.amount} onChange={(e) => handleAmountChange(e.target.value)} /></div>
              <div className="form-group"><label>Reference (Optional)</label><input type="text" placeholder="Receipt #" value={newTransaction.reference} onChange={(e) => setNewTransaction({ ...newTransaction, reference: e.target.value })} /></div>
              <div className="form-group"><label>Notes (Optional)</label><textarea placeholder="Additional notes..." value={newTransaction.notes} onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })} rows={3} /></div>

              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => { setShowAddTransaction(false); setEditingTransaction(null); }} disabled={isSaving || isUpdating}>Cancel</button>
                <button className="btn-save" onClick={editingTransaction ? handleUpdateTransaction : handleAddTransaction} disabled={isSaving || isUpdating}>
                  {(isSaving || isUpdating) ? <><span className="spinner-small"></span>{editingTransaction ? "Updating..." : "Saving..."}</> : (editingTransaction ? "Update" : "Save")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .treasurer-reports { padding: 24px; max-width: auto; margin: 0 auto; background: #f8fafc; min-height: 100vh; }
        .page-header { display: flex; justify-content: space-between; margin-bottom: 24px; }
        .back-btn, .refresh-btn { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: back; border: 1px solid #e0e0e0; border-radius: 8px; cursor: pointer; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .reports-header { text-align: center; margin-bottom: 30px; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; border-radius: 16px; padding: 1px; display: flex; align-items: center; gap: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .stat-card.in { border-left: 4px solid #10b981; }
        .stat-card.out { border-left: 4px solid #ef4444; }
        .stat-card.balance { border-left: 4px solid #3b82f6; }
        .stat-icon { font-size: 32px; width: 56px; height: 56px; background: #f1f5f9; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .stat-value { font-size: 14px; font-weight: 900; display: block; color: #0f172a; }
        .stat-label { font-size: 13px; color: #64748b; }
        .tab-navigation { display: flex; gap: 12px; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; flex-wrap: wrap; }
        .tab-btn { padding: 12px 24px; background: none; border: none; cursor: pointer; font-size: 15px; display: flex; align-items: center; gap: 8px; color: #64748b; }
        .tab-btn.active { color: #3b82f6; border-bottom: 2px solid #3b82f6; margin-bottom: -2px; }
        
        /* Report Tab Styles */
        .report-tab { padding: 20px; }
        .report-generator { background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .report-generator h3 { margin-bottom: 20px; color: #1e293b; }
        .date-range-selector { display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; }
        .date-input-group { display: flex; flex-direction: column; gap: 6px; }
        .date-input-group label { font-size: 12px; font-weight: 600; color: #475569; }
        .date-input-group input { padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; }
        .btn-generate { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; }
        .btn-generate:disabled { opacity: 0.6; cursor: not-allowed; }
        
        .report-preview { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .report-actions { display: flex; gap: 12px; margin-bottom: 24px; justify-content: flex-end; flex-wrap: wrap; }
        .btn-export-txt, .btn-export-html { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; }
        .btn-export-txt { background: #10b981; color: white; }
        .btn-export-html { background: #6366f1; color: white; }
        
        .report-content { max-width: 900px; margin: 0 auto; }
        .report-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
        .report-header h2 { color: #1e293b; margin-bottom: 8px; }
        .report-header p { color: #64748b; font-size: 14px; }
        
        .report-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 30px; }
        .summary-card { background: #f8fafc; border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 12px; }
        .summary-icon { font-size: 28px; }
        .summary-details { display: flex; flex-direction: column; }
        .summary-label { font-size: 12px; color: #64748b; }
        .summary-amount { font-size: 20px; font-weight: 700; }
        .summary-card.income .summary-amount { color: #10b981; }
        .summary-card.expense .summary-amount { color: #ef4444; }
        .summary-card.positive .summary-amount { color: #10b981; }
        .summary-card.negative .summary-amount { color: #ef4444; }
        
        .report-narrative { background: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 30px; }
        .report-narrative h3 { margin-bottom: 12px; color: #1e293b; }
        .report-narrative p { margin: 8px 0; line-height: 1.6; color: #334155; }
        
        .report-breakdown { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .breakdown-section { background: #f8fafc; border-radius: 12px; padding: 20px; }
        .breakdown-section h3 { margin-bottom: 15px; color: #1e293b; }
        .breakdown-section ul { list-style: none; padding: 0; margin: 0; }
        .breakdown-section li { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .breakdown-total { margin-top: 15px; padding-top: 10px; font-weight: 700; text-align: right; border-top: 2px solid #e2e8f0; }
        
        .report-transactions { margin-bottom: 30px; }
        .report-transactions h3 { margin-bottom: 15px; color: #1e293b; }
        .transactions-list { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
        .transaction-item { display: flex; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; background: white; }
        .transaction-item:last-child { border-bottom: none; }
        .transaction-item.in { background: #f0fdf4; }
        .transaction-item.out { background: #fef2f2; }
        .transaction-date { width: 100px; font-size: 12px; color: #64748b; }
        .transaction-description { flex: 2; font-weight: 500; }
        .transaction-category { flex: 1; font-size: 12px; color: #64748b; }
        .transaction-amount { width: 120px; text-align: right; font-weight: 600; }
        .transaction-amount.in { color: #10b981; }
        .transaction-amount.out { color: #ef4444; }
        
        .report-footer { text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
        
        .report-placeholder { text-align: center; padding: 60px 20px; background: white; border-radius: 16px; }
        .report-placeholder h3 { margin: 16px 0 8px; color: #64748b; }
        .report-placeholder p { color: #94a3b8; }
        
        /* Other styles remain the same */
        .ledger-actions { display: flex; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
        .ledger-filters { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .filter-input { padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; }
        .btn-add, .btn-export { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; }
        .btn-add { background: #3b82f6; color: white; }
        .btn-export { background: #10b981; color: white; }
        .ledger-table, .member-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; }
        .ledger-table th, .member-table th { background: #f8fafc; padding: 12px; text-align: left; font-weight: 600; }
        .ledger-table td, .member-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
        .in-row { background: #f0fdf4; }
        .out-row { background: #fef2f2; }
        .amount-in { color: #10b981; font-weight: 600; }
        .amount-out { color: #ef4444; font-weight: 600; }
        .edit-btn, .delete-btn { padding: 4px 8px; margin: 0 4px; border: none; border-radius: 4px; cursor: pointer; }
        .edit-btn { background: #dbeafe; color: #2563eb; }
        .delete-btn { background: #fee2e2; color: #dc2626; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: white; border-radius: 12px; padding: 24px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; margin-bottom: 6px; font-weight: 500; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; }
        .type-buttons { display: flex; gap: 10px; }
        .type-btn { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; }
        .type-btn.active-in { background: #10b981; color: white; }
        .type-btn.active-out { background: #ef4444; color: white; }
        .modal-actions { display: flex; gap: 10px; margin-top: 20px; }
        .btn-cancel, .btn-save { flex: 1; padding: 10px; border: none; border-radius: 6px; cursor: pointer; }
        .btn-cancel { background: #e5e7eb; }
        .btn-save { background: #3b82f6; color: white; }
        .toast { position: fixed; bottom: 20px; right: 20px; padding: 12px 24px; border-radius: 8px; color: white; z-index: 1100; animation: slideIn 0.3s ease; }
        .toast.success { background: #10b981; }
        .toast.error { background: #ef4444; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .spinner-small { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: white; animation: spin 0.6s linear infinite; margin-right: 8px; vertical-align: middle; }
        .btn-save:disabled, .btn-cancel:disabled, .delete-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        
        /* Audit Trail Styles */
        .audit-tab { padding: 20px; }
        .overall-summary-card, .audit-trail-card, .recent-activity-card { background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .summary-stats { display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 15px; }
        .stat-badge { padding: 8px 16px; border-radius: 20px; font-weight: 600; }
        .stat-badge.in { background: #dcfce7; color: #10b981; }
        .stat-badge.out { background: #fee2e2; color: #ef4444; }
        .stat-badge.balance { background: #eff6ff; color: #3b82f6; }
        .audit-warning { background: #fef3c7; padding: 10px; border-radius: 8px; color: #92400e; margin-bottom: 20px; }
        .audit-timeline { max-height: 500px; overflow-y: auto; }
        .audit-item { padding: 15px; margin-bottom: 15px; border-radius: 8px; border-left: 4px solid; background: #f8fafc; }
        .audit-create { border-left-color: #10b981; background: #f0fdf4; }
        .audit-update { border-left-color: #f59e0b; background: #fffbeb; }
        .audit-delete { border-left-color: #ef4444; background: #fef2f2; }
        .audit-header { display: flex; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; }
        .audit-time { font-size: 12px; color: #64748b; }
        .audit-performed-by { font-size: 13px; margin-bottom: 10px; }
        .audit-ip { margin-left: 10px; font-size: 11px; color: #94a3b8; }
        .audit-changes { margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
        .change-diff { font-size: 13px; padding: 5px 0; font-family: monospace; }
        .field-name { font-weight: bold; color: #3b82f6; margin-right: 8px; }
        .old-value { color: #dc2626; text-decoration: line-through; margin-right: 8px; }
        .new-value { color: #10b981; font-weight: bold; }
        .recent-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; }
        .recent-stat { text-align: center; padding: 15px; background: #f8fafc; border-radius: 8px; }
        .recent-number { display: block; font-size: 28px; font-weight: bold; color: #3b82f6; }
        .recent-label { font-size: 12px; color: #64748b; }
        
        /* Mobile Card Styles */
        .mobile-cards { display: none; flex-direction: column; gap: 12px; }
        .mobile-card { background: white; border-radius: 12px; padding: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .in-card { border-left: 4px solid #10b981; }
        .out-card { border-left: 4px solid #ef4444; }
        .card-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .card-date { font-size: 12px; color: #64748b; }
        .card-description { font-weight: bold; margin-bottom: 5px; }
        .card-category { font-size: 12px; color: #64748b; margin-bottom: 10px; }
        .card-amounts { display: flex; justify-content: space-between; margin-top: 10px; flex-wrap: wrap; gap: 8px; }
        .card-balance { font-size: 12px; font-weight: bold; }
        .member-mobile-card { background: white; border-radius: 12px; padding: 15px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .member-name { font-weight: bold; font-size: 16px; margin-bottom: 10px; }
        
        @media (max-width: 768px) {
          .treasurer-reports { padding: 16px; }
          .stats-grid { grid-template-columns: 1fr; gap: 12px; }
          .tab-btn { padding: 8px 12px; font-size: 12px; }
          .report-summary { grid-template-columns: 1fr; gap: 12px; }
          .report-breakdown { grid-template-columns: 1fr; gap: 16px; }
          .date-range-selector { flex-direction: column; align-items: stretch; }
          .btn-generate { justify-content: center; }
          .ledger-table-container table, .member-table-container table { display: none; }
          .mobile-cards { display: flex; }
          .transaction-item { flex-wrap: wrap; gap: 8px; }
          .transaction-date { width: 100%; }
          .transaction-amount { width: 100%; text-align: left; }
        }
        
        @media (min-width: 769px) { .mobile-cards { display: none; } }

        .btn-export-pdf { background: #ef4444; color: white; display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; }
.btn-export-word { background: #3b82f6; color: white; display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; }
      `}</style>
    </div>
  );
}