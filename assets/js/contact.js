(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form[name="contact"]');
    const messagesDiv = document.getElementById('form-messages');

    if (!form || !messagesDiv) {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (window.location.hash === '#success' || urlParams.get('success') === 'true') {
      messagesDiv.innerHTML = '<div class="form-status success">Thank you for your message. I will get back to you soon.</div>';
      if (window.location.hash === '#success') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      messagesDiv.innerHTML = '';

      const button = form.querySelector('button[type="submit"]');
      const originalText = button.textContent;
      button.textContent = 'Sending...';
      button.disabled = true;

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: {
            Accept: 'application/json'
          }
        });

        if (!response.ok) {
          let errorMsg = 'Sorry, there was an error sending your message. Please try again or contact me directly via social media.';
          try {
            const data = await response.json();
            if (data && data.errors) {
              errorMsg = data.errors.map((item) => item.message).join(', ');
            }
          } catch (_) {}
          throw new Error(errorMsg);
        }

        form.reset();
        messagesDiv.innerHTML = '<div class="form-status success">Thank you for your message. I will get back to you soon.</div>';
      } catch (error) {
        messagesDiv.innerHTML = `<div class="form-status error">${error && error.message ? error.message : 'There was an error sending your message.'}</div>`;
      } finally {
        button.textContent = originalText;
        button.disabled = false;
      }
    });
  });
})();
