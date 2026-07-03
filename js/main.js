// ===== HERO VIDEO PARALLAX =====
(function () {
  const parallaxVideos = document.querySelectorAll('.hero-video');
  if (!parallaxVideos.length) return;

  function updateParallax() {
    const viewportHeight = window.innerHeight;
    
    parallaxVideos.forEach(video => {
      const container = video.parentElement;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      
      // Check if container is in viewport
      if (rect.bottom < 0 || rect.top > viewportHeight) return;
      
      const containerHeight = rect.height;
      // Calculate visibility progress: 0 (entering bottom) to 1 (leaving top)
      const totalRange = viewportHeight + containerHeight;
      const currentScroll = viewportHeight - rect.top;
      const progress = Math.max(0, Math.min(1, currentScroll / totalRange));
      
      // The video is 120% height and top is -10%. 
      // So extra height is 20% of container height.
      // We want to translate from +10% to -10% of container height.
      const extraHeight = containerHeight * 0.2;
      const translateY = (0.5 - progress) * extraHeight;
      
      video.style.transform = `translateY(${translateY}px)`;
    });
  }

  let ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(function () {
        updateParallax();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
  
  // Run on load and resize
  window.addEventListener('resize', updateParallax);
  updateParallax();
})();

// ===== NAVBAR SCROLL =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});
// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}
// ===== ROOM FILTER TABS =====
const filterBtns = document.querySelectorAll('.filter-btn');
const roomCards = document.querySelectorAll('.room-detail-card');
if (filterBtns.length) {
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      roomCards.forEach(card => {
        if (filter === 'all' || card.dataset.category === filter) {
          card.style.display = 'grid';
          setTimeout(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; }, 10);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(20px)';
          setTimeout(() => { card.style.display = 'none'; }, 300);
        }
      });
    });
  });
}
// ===== CONTACT FORM =====
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    const formData = new FormData(contactForm);
    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        // ===== Build a readable WhatsApp message from the real form data =====
        const firstName = formData.get('first_name') || '';
        const lastName = formData.get('last_name') || '';
        const email = formData.get('email') || '';
        const phone = formData.get('phone') || '';
        const roomType = formData.get('room_type') || '';
        const checkin = formData.get('checkin_date') || '';
        const checkout = formData.get('checkout_date') || '';
        const guests = formData.get('guests') || '';
        const message = formData.get('message') || '';

        const waLines = [
          '🏔️ *New Booking Request — Kites Mountain*',
          '',
          `👤 *Name:* ${firstName} ${lastName}`.trim(),
          `📞 *Phone:* ${phone || 'N/A'}`,
          `✉️ *Email:* ${email || 'N/A'}`,
          `🛏️ *Room Type:* ${roomType || 'N/A'}`,
          `📅 *Check-in:* ${checkin || 'N/A'}`,
          `📅 *Check-out:* ${checkout || 'N/A'}`,
          `👥 *Guests:* ${guests || 'N/A'}`
        ];
        if (message) {
          waLines.push('', `📝 *Message:* ${message}`);
        }
        waLines.push('', '✅ Please confirm availability for these dates. Thank you!');

        const waMessage = encodeURIComponent(waLines.join('\n'));
        const waLink = `https://wa.me/94775243432?text=${waMessage}`;

        const overlay = document.createElement('div');
        overlay.id = 'bookingPopup';
        overlay.style.cssText = `
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.6); display: flex; align-items: center;
          justify-content: center; z-index: 9999;
        `;
        overlay.innerHTML = `
          <div style="background: white; border-radius: 16px; padding: 40px; max-width: 420px;
            width: 90%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
            <h3 style="font-family: 'Playfair Display', serif; font-size: 24px; margin-bottom: 12px; color: #1a1a1a;">
              Booking Request Received!
            </h3>
            <p style="color: #666; margin-bottom: 24px; line-height: 1.6;">
              Thank you for choosing Kites Mountain. To confirm your reservation, please contact us on WhatsApp.
            </p>
            <a href="${waLink}" target="_blank"
              style="display: inline-block; background: #25D366; color: white; padding: 14px 28px;
              border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;
              margin-bottom: 12px; width: 100%; box-sizing: border-box;">
              📲 Confirm Booking on WhatsApp
            </a>
            <br/>
            <button id="closePopup"
              style="background: none; border: none; color: #999; cursor: pointer; margin-top: 8px; font-size: 14px;">
              Close
            </button>
          </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('closePopup').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        contactForm.reset();
      } else {
        btn.textContent = 'Something went wrong. Try again.';
        btn.style.background = '#e74c3c';
        btn.style.color = 'white';
        setTimeout(() => {
          btn.textContent = 'Send Message';
          btn.style.background = '';
          btn.style.color = '';
        }, 3000);
      }
    } catch (error) {
      btn.textContent = 'Network error. Try again.';
      btn.style.background = '#e74c3c';
      btn.style.color = 'white';
    }
  });
}
// ===== SCROLL REVEAL =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll(
  '.room-card, .amenity-card, .testimonial-card, .event-card, .venue-card, .amenity-detail-card, .stat-item'
).forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(28px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(el);
});
// ===== FLOATING BUTTONS =====
function createFloatingButtons() {
  const floatingBtns = document.createElement('div');
  floatingBtns.style.cssText = `
    position: fixed; bottom: 24px; right: 24px;
    display: flex; flex-direction: column; align-items: flex-end;
    gap: 12px; z-index: 9998;
  `;
  floatingBtns.innerHTML = `
    <a href="https://wa.me/94775243432" target="_blank" rel="noopener"
      title="Chat on WhatsApp"
      style="width: 56px; height: 56px; min-width: 56px; min-height: 56px; flex-shrink: 0;
      border-radius: 50%; background: #25D366;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(37,211,102,0.5); transition: transform 0.2s;">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.557 4.17 1.535 5.943L.057 23.57a.75.75 0 0 0 .92.92l5.687-1.476A11.953 11.953 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.726 9.726 0 0 1-4.989-1.371l-.358-.213-3.712.964.991-3.624-.233-.373A9.718 9.718 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
      </svg>
    </a>
    <a href="https://www.booking.com/hotel/lk/kits-mountaion.en-gb.html?aid=2375516&label=01J1X42R3M4D4ZBF77BKWAKKWV_01KV2T17CBASDZ67RGN4X0PX5G#hp_facilities_box" target="_blank" rel="noopener"
      title="Book on Booking.com"
      style="width: 56px; height: 56px; min-width: 56px; min-height: 56px; flex-shrink: 0;
      border-radius: 50%; background: #003580;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(0,53,128,0.5); transition: transform 0.2s; text-decoration: none;">
      <span style="color: white; font-size: 28px; font-weight: 900; font-family: Georgia, serif; line-height: 1;">𝔹</span>
    </a>
  `;
  document.body.appendChild(floatingBtns);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createFloatingButtons);
} else {
  createFloatingButtons();
}
