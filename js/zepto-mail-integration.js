/**
 * Zepto Mail Integration for Contact Form
 * Handles form submission and email delivery
 */

class ZeptoMailIntegration {
  constructor(config = {}) {
    this.apiKey = config.apiKey || localStorage.getItem('zeptoMailKey');
    this.senderEmail = config.senderEmail || 'noreply@taiyzun.com';
    this.recipientEmail = config.recipientEmail || 'taiyzun@gmail.com';
    this.endpoint = 'https://api.zeptomail.com/v1.1/email';
  }

  /**
   * Initialize form integration
   */
  init() {
    const form = document.getElementById('contactForm');
    if (!form) {
      console.warn('Contact form not found');
      return;
    }

    // Change form action and prevent default Formspree handling
    form.action = '';
    form.method = 'POST';
    form.addEventListener('submit', (e) => this.handleSubmit(e));

    console.log('✅ Zepto Mail integration initialized');
  }

  /**
   * Handle form submission
   */
  async handleSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('.submit-btn');
    const formStatus = document.getElementById('form-status');

    // Get form data
    const name = form.querySelector('[name="name"]')?.value.trim();
    const email = form.querySelector('[name="email"]')?.value.trim();
    const message = form.querySelector('[name="message"]')?.value.trim();

    // Validate
    if (!this.validateForm(name, email, message)) {
      this.showStatus('Please fill in all required fields', 'error', formStatus);
      return;
    }

    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    formStatus.style.display = 'block';
    formStatus.textContent = 'Sending your message...';
    formStatus.classList.remove('success', 'error');

    try {
      // Send via Zepto Mail
      const response = await this.sendViaZeptoMail(name, email, message);

      if (response.success) {
        this.showStatus('✨ Message sent successfully! I\'ll get back to you soon.', 'success', formStatus);
        submitBtn.textContent = 'Message Sent ✓';
        form.reset();

        // Reset button after 3 seconds
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Message';
        }, 3000);
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      this.showStatus('⚠️ Error sending message. Please try again or email directly.', 'error', formStatus);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }
  }

  /**
   * Send email via Zepto Mail API
   */
  async sendViaZeptoMail(name, email, message) {
    if (!this.apiKey) {
      // Fallback: send to form service if API key not configured
      console.warn('Zepto Mail API key not configured, using fallback...');
      return this.fallbackSend(name, email, message);
    }

    const emailPayload = {
      from: {
        address: this.senderEmail,
        name: 'Taiyzun - Contact Form'
      },
      to: [
        {
          address: this.recipientEmail,
          name: 'Taiyzun'
        }
      ],
      subject: `New Contact Message from ${name}`,
      htmlBody: this.buildEmailHTML(name, email, message),
      textBody: this.buildEmailText(name, email, message),
      replyTo: {
        address: email,
        name: name
      }
    };

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Zoho-enczapikey ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      });

      const data = await response.json();

      if (response.ok && data.data) {
        return { success: true, message: 'Email sent successfully' };
      } else {
        return {
          success: false,
          message: data.message || 'Failed to send email'
        };
      }
    } catch (error) {
      console.error('Zepto Mail API error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Fallback: Send via alternative email service
   */
  async fallbackSend(name, email, message) {
    // Use Formspree as fallback if Zepto Mail not configured
    try {
      const response = await fetch('https://formspree.io/f/mzzbvglv', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          email: email,
          message: message,
          _subject: `New Contact Message from ${name}`
        })
      });

      if (response.ok) {
        return { success: true, message: 'Email sent successfully' };
      } else {
        return { success: false, message: 'Failed to send email' };
      }
    } catch (error) {
      console.error('Fallback send error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Build HTML email body
   */
  buildEmailHTML(name, email, message) {
    return `
      <div style="font-family: 'Philosopher', sans-serif; color: #f0ece4; background: #0a0a0f; padding: 40px; max-width: 600px; margin: 0 auto;">
        <div style="border-bottom: 2px solid #c9a84c; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="color: #c9a84c; font-size: 24px; margin: 0;">New Contact Message</h1>
        </div>

        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          <strong style="color: #c9a84c;">From:</strong> ${this.escapeHTML(name)}
        </p>
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          <strong style="color: #c9a84c;">Email:</strong> <a href="mailto:${this.escapeHTML(email)}" style="color: #e4cb78;">${this.escapeHTML(email)}</a>
        </p>

        <div style="background: rgba(201,168,76,0.05); border-left: 4px solid #c9a84c; padding: 20px; margin: 30px 0;">
          <p style="font-size: 16px; line-height: 1.7; margin: 0; white-space: pre-wrap;">${this.escapeHTML(message)}</p>
        </div>

        <div style="border-top: 1px solid #c9a84c; padding-top: 20px; margin-top: 30px; text-align: center;">
          <p style="font-size: 12px; color: #a0a0a0; margin: 0;">
            This message was sent via taiyzun.com contact form
          </p>
          <p style="font-size: 12px; color: #a0a0a0; margin: 10px 0 0;">
            Reply directly to ${this.escapeHTML(email)}
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Build text email body
   */
  buildEmailText(name, email, message) {
    return `
NEW CONTACT MESSAGE

From: ${name}
Email: ${email}

---

${message}

---

This message was sent via taiyzun.com contact form
Reply directly to ${email}
    `.trim();
  }

  /**
   * Validate form inputs
   */
  validateForm(name, email, message) {
    if (!name || name.length < 2) {
      console.warn('Invalid name');
      return false;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.warn('Invalid email');
      return false;
    }

    if (!message || message.length < 10) {
      console.warn('Message too short');
      return false;
    }

    return true;
  }

  /**
   * Show status message
   */
  showStatus(message, type, element) {
    if (!element) {
      element = document.getElementById('form-status');
    }

    if (!element) {
      console.warn('Status element not found');
      return;
    }

    element.textContent = message;
    element.className = `${type}`;
    element.style.display = 'block';

    // Auto-hide success message after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        element.style.display = 'none';
      }, 5000);
    }
  }

  /**
   * Escape HTML characters
   */
  escapeHTML(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (c) => map[c]);
  }

  /**
   * Configure API key (call after initialization)
   */
  setApiKey(key) {
    this.apiKey = key;
    localStorage.setItem('zeptoMailKey', key);
  }

  /**
   * Configure recipient email
   */
  setRecipientEmail(email) {
    this.recipientEmail = email;
  }

  /**
   * Configure sender email
   */
  setSenderEmail(email) {
    this.senderEmail = email;
  }
}

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  window.zeptoMail = new ZeptoMailIntegration({
    apiKey: localStorage.getItem('zeptoMailKey'),
    senderEmail: 'noreply@taiyzun.com',
    recipientEmail: 'taiyzun@gmail.com'
  });
  window.zeptoMail.init();
});

// Export for manual initialization
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZeptoMailIntegration;
}
