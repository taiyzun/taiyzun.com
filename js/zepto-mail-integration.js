/**
 * Contact form handler for the Zepto-backed server endpoint.
 * The browser only talks to taiyzun.com; provider selection happens server-side.
 */

class TaiyzunContactForm {
  constructor(config = {}) {
    this.endpoint = config.endpoint || '/api/contact';
    this.successMessage = config.successMessage || 'Message sent. Thank you for reaching out — I will be in touch soon.';
    this.errorMessage = config.errorMessage || 'Something went wrong. Please try again or reach out via social media.';
    this.successButtonHTML = config.successButtonHTML || 'Message Sent ✓';
  }

  init() {
    const form = document.getElementById('contactForm');
    if (!form || form.dataset.contactBound === 'true') {
      return;
    }

    this.form = form;
    this.status = document.getElementById('form-status');
    this.submitButton = form.querySelector('.submit-btn');
    this.defaultButtonHTML = this.submitButton ? this.submitButton.innerHTML : 'Send Message';

    if (!this.form.getAttribute('action')) {
      this.form.setAttribute('action', this.endpoint);
    }

    this.form.addEventListener('submit', (event) => this.handleSubmit(event));
    this.form.addEventListener('input', (event) => {
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
      if (!field.name) return;
      this.setFieldError(field.name, '');
    });
    this.form.dataset.contactBound = 'true';
  }

  async handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(this.form);
    const honeypot = String(formData.get('_gotcha') || '').trim();

    if (honeypot) {
      this.form.reset();
      this.showStatus(this.successMessage, 'success');
      return;
    }

    if (!this.validate(formData)) {
      return;
    }

    this.setLoadingState(true);
    this.showStatus('', '');

    try {
      const response = await fetch(this.form.action || this.endpoint, {
        method: this.form.method || 'POST',
        body: formData,
        headers: {
          Accept: 'application/json'
        }
      });

      const payload = await this.readResponse(response);
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.message || this.errorMessage);
      }

      this.form.reset();
      this.showStatus(payload.message || this.successMessage, 'success');
      this.setSuccessState();
    } catch (error) {
      this.showStatus(error.message || this.errorMessage, 'error');
      this.setLoadingState(false);
    }
  }

  validate(formData) {
    this.clearFieldErrors();
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const message = String(formData.get('message') || '').trim();

    if (name.length < 2) {
      this.reportInvalidField('name', 'Please enter your name.');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.reportInvalidField('email', 'Please enter a valid email address.');
      return false;
    }

    if (message.length < 10) {
      this.reportInvalidField('message', 'Please share a little more detail in your message.');
      return false;
    }

    return true;
  }

  setFieldError(name, message) {
    const field = this.form?.elements?.namedItem(name);
    const error = document.getElementById(`${name}-error`);
    if (field instanceof HTMLElement) {
      if (message) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
    }
    if (error) error.textContent = message;
  }

  clearFieldErrors() {
    ['name', 'email', 'message'].forEach((name) => this.setFieldError(name, ''));
  }

  reportInvalidField(name, message) {
    this.setFieldError(name, message);
    this.showStatus(message, 'error');
    const field = this.form?.elements?.namedItem(name);
    if (field instanceof HTMLElement) field.focus();
  }

  async readResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }

    const text = await response.text();
    return text ? { message: text } : {};
  }

  setLoadingState(isLoading) {
    if (!this.submitButton) {
      return;
    }

    this.submitButton.disabled = isLoading;
    this.submitButton.innerHTML = isLoading ? 'Sending…' : this.defaultButtonHTML;
  }

  setSuccessState() {
    if (!this.submitButton) {
      return;
    }

    this.submitButton.disabled = true;
    this.submitButton.innerHTML = this.successButtonHTML;

    window.setTimeout(() => {
      this.submitButton.disabled = false;
      this.submitButton.innerHTML = this.defaultButtonHTML;
    }, 3000);
  }

  showStatus(message, type) {
    if (!this.status) {
      return;
    }

    this.status.textContent = message;
    this.status.className = type || '';
    this.status.style.display = message ? 'block' : 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.taiyzunContactForm = new TaiyzunContactForm();
  window.taiyzunContactForm.init();
});
