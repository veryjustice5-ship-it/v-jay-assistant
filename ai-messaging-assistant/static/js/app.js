document.addEventListener('DOMContentLoaded', () => {
  const simForm = document.getElementById('simulate-form');
  const replyContainer = document.getElementById('reply-container');
  const emergencyBtn = document.getElementById('emergency-btn');

  if (simForm) {
    simForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const channel = document.getElementById('sim-channel').value;
      const sender_name = document.getElementById('sim-sender').value;
      const text = document.getElementById('sim-text').value;

      replyContainer.innerHTML = '<div class="spinner-border text-primary" role="status"></div> Processing message through 8-stage pipeline...';

      try {
        const res = await fetch('/api/messages/process', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            text,
            sender_name,
            channel,
            sender_id: sender_name.toLowerCase().includes('sarah') ? 'contact-sarah' : 'contact-unknown'
          })
        });
        const data = await res.json();
        renderResult(data);
      } catch (err) {
        replyContainer.innerHTML = `<div class="alert alert-danger">Error processing message: ${err.message}</div>`;
      }
    });
  }

  function renderResult(data) {
    if (!data.success) {
      replyContainer.innerHTML = `<div class="alert alert-danger"><strong>Rejected:</strong> ${data.error}</div>`;
      return;
    }
    const isAuto = data.decision === 'AUTO_SEND_ELIGIBLE';
    const isBlocked = data.decision === 'BLOCKED_BY_SAFETY';
    const badgeClass = isAuto ? 'bg-success' : (isBlocked ? 'bg-danger' : 'bg-warning text-dark');

    replyContainer.innerHTML = `
      <div class="mb-3">
        <span class="badge ${badgeClass} fs-6 mb-2">${data.decision}</span>
        <p class="text-muted small">${data.decision_reason}</p>
      </div>
      <div class="p-3 bg-light rounded mb-3">
        <strong>Suggested Reply:</strong>
        <p class="mb-0 mt-1">${data.reply.suggested_text}</p>
      </div>
      ${isAuto ? `<div class="alert alert-success py-2">✓ Simulated Auto-Sent (Transmission ID: ${data.send_result?.transmission_id})</div>` : ''}
    `;
  }
});
