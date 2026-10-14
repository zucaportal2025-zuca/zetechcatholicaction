const axios = require('axios');

// Brevo API configuration
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3';

// Headers for all Brevo requests
const brevoHeaders = {
  'api-key': BREVO_API_KEY,
  'Content-Type': 'application/json'
};

/**
 * Get email statistics from Brevo
 * @param {Object} params - Filter parameters
 * @param {string} params.email - Filter by email address
 * @param {string} params.tag - Filter by tag
 * @param {number} params.limit - Number of results (default: 50)
 * @param {number} params.offset - Pagination offset (default: 0)
 * @param {string} params.startDate - Start date (YYYY-MM-DD)
 * @param {string} params.endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Brevo email statistics
 */
async function getEmailStats(params = {}) {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.email) queryParams.append('email', params.email);
    if (params.tag) queryParams.append('tag', params.tag);
    if (params.limit) queryParams.append('limit', params.limit || 50);
    if (params.offset) queryParams.append('offset', params.offset || 0);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    const response = await axios.get(
      `${BREVO_API_URL}/transactionalEmails/statistics?${queryParams.toString()}`,
      { headers: brevoHeaders }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching email stats from Brevo:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get the full content of a specific email
 * @param {string} messageId - Brevo's message ID
 * @returns {Promise<Object>} Email content (HTML, text, subject)
 */
async function getEmailContent(messageId) {
  try {
    const response = await axios.get(
      `${BREVO_API_URL}/transactionalEmails/${messageId}/content`,
      { headers: brevoHeaders }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching email content from Brevo:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get a contact's status from Brevo
 * @param {string} email - User's email address
 * @returns {Promise<Object>} Contact data
 */
async function getContactStatus(email) {
  try {
    const response = await axios.get(
      `${BREVO_API_URL}/contacts/${encodeURIComponent(email)}`,
      { headers: brevoHeaders }
    );
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      // Contact doesn't exist in Brevo yet
      return { 
        email: email, 
        unsubscribed: false,
        exists: false 
      };
    }
    console.error('Error fetching contact from Brevo:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Re-subscribe a user in Brevo (unlock them)
 * @param {string} email - User's email address
 * @returns {Promise<Object>} Updated contact data
 */
async function resubscribeContact(email) {
  try {
    const response = await axios.put(
      `${BREVO_API_URL}/contacts/${encodeURIComponent(email)}`,
      { unsubscribed: false },
      { headers: brevoHeaders }
    );
    return response.data;
  } catch (error) {
    console.error('Error re-subscribing contact in Brevo:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Update a contact's attributes in Brevo
 * @param {string} email - User's email address
 * @param {Object} attributes - Key-value pairs of attributes to update
 * @returns {Promise<Object>} Updated contact data
 */
async function updateContactAttributes(email, attributes) {
  try {
    const response = await axios.put(
      `${BREVO_API_URL}/contacts/${encodeURIComponent(email)}`,
      { attributes },
      { headers: brevoHeaders }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating contact attributes in Brevo:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get aggregated statistics from Brevo
 * @param {Object} params - Filter parameters
 * @param {string} params.tag - Filter by tag
 * @param {string} params.startDate - Start date (YYYY-MM-DD)
 * @param {string} params.endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Aggregated stats
 */
async function getAggregatedStats(params = {}) {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.tag) queryParams.append('tag', params.tag);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    const response = await axios.get(
      `${BREVO_API_URL}/transactionalEmails/statistics?${queryParams.toString()}`,
      { headers: brevoHeaders }
    );
    
    // Calculate aggregates
    const events = response.data.events || [];
    const stats = {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unsubscribed: 0,
      total: events.length
    };
    
    events.forEach(event => {
      switch(event.event) {
        case 'delivered': 
          stats.delivered++; 
          stats.sent++; 
          break;
        case 'opened': 
          stats.opened++; 
          break;
        case 'clicked': 
          stats.clicked++; 
          break;
        case 'hard_bounce': 
        case 'soft_bounce': 
          stats.bounced++; 
          break;
        case 'unsubscribe': 
          stats.unsubscribed++; 
          break;
        default: 
          break;
      }
    });
    
    return stats;
  } catch (error) {
    console.error('Error fetching aggregated stats from Brevo:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send a test email via Brevo
 * @param {string} email - Recipient email
 * @param {string} subject - Email subject
 * @param {string} content - Email content (HTML)
 * @returns {Promise<Object>} Send response
 */
async function sendTestEmail(email, subject, content) {
  try {
    const response = await axios.post(
      `${BREVO_API_URL}/smtp/email`,
      {
        sender: {
          name: 'ZUCA Portal',
          email: process.env.BREVO_SENDER_EMAIL || 'no-reply@zucaportal.com'
        },
        to: [{ email: email }],
        subject: subject,
        htmlContent: content,
        tags: ['test_email']
      },
      { headers: brevoHeaders }
    );
    return response.data;
  } catch (error) {
    console.error('Error sending test email via Brevo:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  getEmailStats,
  getEmailContent,
  getContactStatus,
  resubscribeContact,
  updateContactAttributes,
  getAggregatedStats,
  sendTestEmail
};