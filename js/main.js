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
// ===== CALENDAR DYNAMIC MIN-DATE & VALIDATION =====
(function () {
  const checkinInput = document.querySelector('input[name="checkin_date"]');
  const checkoutInput = document.querySelector('input[name="checkout_date"]');
  if (!checkinInput || !checkoutInput) return;

  const today = new Date().toISOString().split('T')[0];
  checkinInput.min = today;
  checkoutInput.min = today;

  checkinInput.addEventListener('change', function () {
    if (this.value) {
      const selected = new Date(this.value);
      selected.setDate(selected.getDate() + 1);
      const nextDay = selected.toISOString().split('T')[0];
      checkoutInput.min = nextDay;
      if (checkoutInput.value && checkoutInput.value < nextDay) {
        checkoutInput.value = nextDay;
      }
    }
  });
})();

// ===== ROOM AUTO-SELECT & SMOOTH SCROLL FROM URL ?room= =====
(function () {
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get('room');
  if (!roomParam) return;
  
  const select = document.querySelector('select[name="room_type"]');
  if (select) {
    const decoded = decodeURIComponent(roomParam.replace(/\+/g, ' ')).toLowerCase().trim();
    for (let i = 0; i < select.options.length; i++) {
      const optVal = select.options[i].value.toLowerCase().trim();
      const optText = select.options[i].text.toLowerCase().trim();
      if (optVal === decoded || optText === decoded || optVal.includes(decoded) || decoded.includes(optVal)) {
        select.selectedIndex = i;
        break;
      }
    }
  }

  // Smooth scroll down to booking form if hash or room param present
  window.addEventListener('DOMContentLoaded', () => {
    const formWrap = document.getElementById('booking-form');
    if (formWrap) {
      setTimeout(() => {
        formWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  });
})();

// ===== CONTACT FORM & WHATSAPP SUBMISSION =====
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // ===== PREVENT DUPLICATE SUBMISSIONS & 3-MINUTE COOLDOWN =====
    const lastBookingTime = localStorage.getItem('lastBookingTime');
    const now = Date.now();
    const cooldownMs = 180000; // 3 minutes = 180,000 ms

    if (lastBookingTime && (now - parseInt(lastBookingTime, 10)) < cooldownMs) {
      alert("You have already sent a booking request! Please check your open WhatsApp tab or wait a few minutes before trying again.");
      return;
    }

    const btn = contactForm.querySelector('button[type="submit"]');
    btn.textContent = 'Sending... Please wait';
    btn.disabled = true;
    const formData = new FormData(contactForm);

    // ===== Build WhatsApp message from form data =====
    const firstName   = formData.get('first_name')   || '';
    const lastName    = formData.get('last_name')    || '';
    const email       = formData.get('email')         || '';
    const phone       = formData.get('phone')         || '';
    const roomType    = formData.get('room_type')     || '';
    const checkin     = formData.get('checkin_date')  || '';
    const checkout    = formData.get('checkout_date') || '';
    const arrivalTime = formData.get('arrival_time')  || '';
    const guests      = formData.get('guests')        || '';
    const message     = formData.get('message')       || '';

    const waLines = [
      '🏔️ *New Booking Request — Kites Mountain*',
      '',
      `👤 *Name:* ${firstName} ${lastName}`.trim(),
      `📞 *Phone:* ${phone || 'N/A'}`,
      `✉️ *Email:* ${email || 'N/A'}`,
      `🛏️ *Room Type:* ${roomType || 'N/A'}`,
      `📅 *Check-in:* ${checkin || 'N/A'}`,
      `📅 *Check-out:* ${checkout || 'N/A'}`,
      `⏰ *Check-in Time:* ${arrivalTime || 'N/A'}`,
      `👥 *Guests:* ${guests || 'N/A'}`
    ];
    if (message) waLines.push('', `📝 *Message:* ${message}`);
    waLines.push('', '✅ Please confirm availability for these dates. Thank you!');

    const waMessage = encodeURIComponent(waLines.join('\n'));
    const waLink = `https://wa.me/94775243432?text=${waMessage}`;

    try {
      // Send email via Formspree
      const response = await fetch(contactForm.action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        // Save submission timestamp to LocalStorage lock
        localStorage.setItem('lastBookingTime', Date.now().toString());
        contactForm.reset();

        // ===== Automatically open WhatsApp ONCE with booking details =====
        window.open(waLink, '_blank');

        // ===== Show success popup =====
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
              Booking Request Sent!
            </h3>
            <p style="color: #666; margin-bottom: 8px; line-height: 1.6;">
              Your request has been emailed to us.<br/>
              WhatsApp has opened so you can confirm your reservation directly.
            </p>
            <p style="color: #999; font-size: 13px; margin-bottom: 24px;">
              (If WhatsApp didn't open, tap the button below.)
            </p>
            <a href="${waLink}" target="_blank"
              style="display: inline-block; background: #25D366; color: white; padding: 14px 28px;
              border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;
              margin-bottom: 12px; width: 100%; box-sizing: border-box;">
              📲 Open WhatsApp
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
        overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });

        btn.textContent = 'Send Message';
        btn.disabled = false;
      } else {
        btn.textContent = 'Something went wrong. Try again.';
        btn.style.background = '#e74c3c';
        btn.style.color = 'white';
        btn.disabled = false;
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
      btn.disabled = false;
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
  floatingBtns.className = 'floating-social-btns';
  floatingBtns.style.cssText = `
    position: fixed; bottom: 20px; right: 20px;
    display: flex; flex-direction: column; align-items: center;
    gap: 10px; z-index: 9998;
  `;
  floatingBtns.innerHTML = `
    <!-- WhatsApp Floating Button -->
    <a href="https://wa.me/94775243432" target="_blank" rel="noopener"
      title="Chat on WhatsApp" aria-label="Chat on WhatsApp"
      style="width: 48px; height: 48px; min-width: 48px; min-height: 48px; flex-shrink: 0;
      border-radius: 50%; background: #25D366;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(37,211,102,0.45); transition: transform 0.25s ease, box-shadow 0.25s ease; text-decoration: none;"
      onmouseenter="this.style.transform='scale(1.14)'; this.style.boxShadow='0 6px 20px rgba(37,211,102,0.65)';"
      onmouseleave="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 14px rgba(37,211,102,0.45)';">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.557 4.17 1.535 5.943L.057 23.57a.75.75 0 0 0 .92.92l5.687-1.476A11.953 11.953 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.726 9.726 0 0 1-4.989-1.371l-.358-.213-3.712.964.991-3.624-.233-.373A9.718 9.718 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
      </svg>
    </a>
    <!-- Facebook Floating Button -->
    <a href="https://www.facebook.com/share/18QkztvFvR/?mibextid=wwXIfr" target="_blank" rel="noopener"
      title="Follow us on Facebook" aria-label="Follow us on Facebook"
      style="width: 48px; height: 48px; min-width: 48px; min-height: 48px; flex-shrink: 0;
      border-radius: 50%; background: #1877F2;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(24,119,242,0.45); transition: transform 0.25s ease, box-shadow 0.25s ease; text-decoration: none;"
      onmouseenter="this.style.transform='scale(1.14)'; this.style.boxShadow='0 6px 20px rgba(24,119,242,0.65)';"
      onmouseleave="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 14px rgba(24,119,242,0.45)';">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    </a>
    <!-- Instagram Floating Button -->
    <a href="https://www.instagram.com/kitesmountain?igsh=MWwxdWNndDJ2cDdpMA==" target="_blank" rel="noopener"
      title="Follow us on Instagram" aria-label="Follow us on Instagram"
      style="width: 48px; height: 48px; min-width: 48px; min-height: 48px; flex-shrink: 0;
      border-radius: 50%; background: radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(214,36,159,0.45); transition: transform 0.25s ease, box-shadow 0.25s ease; text-decoration: none;"
      onmouseenter="this.style.transform='scale(1.14)'; this.style.boxShadow='0 6px 20px rgba(214,36,159,0.65)';"
      onmouseleave="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 14px rgba(214,36,159,0.45)';">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    </a>
    <!-- TikTok Floating Button -->
    <a href="https://www.tiktok.com/@kites_mountain?is_from_webapp=1&sender_device=pc" target="_blank" rel="noopener"
      title="Follow us on TikTok" aria-label="Follow us on TikTok"
      style="width: 48px; height: 48px; min-width: 48px; min-height: 48px; flex-shrink: 0;
      border-radius: 50%; background: #000000;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.45); transition: transform 0.25s ease, box-shadow 0.25s ease; text-decoration: none;"
      onmouseenter="this.style.transform='scale(1.14)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.65)';"
      onmouseleave="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 14px rgba(0,0,0,0.45)';">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.9 2.83 2.896 2.896 0 0 1-2.89-2.89 2.896 2.896 0 0 1 2.89-2.89c.277 0 .542.043.792.122v-3.52a6.37 6.37 0 0 0-.792-.05C5.836 9.274 2.8 12.31 2.8 16.055 2.8 19.8 5.836 22.836 9.58 22.836c3.746 0 6.782-3.036 6.782-6.781v-7.14a8.214 8.214 0 0 0 4.787 1.527v-3.52a4.792 4.792 0 0 1-1.56-.236z"/>
      </svg>
    </a>
  `;
  document.body.appendChild(floatingBtns);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createFloatingButtons);
} else {
  createFloatingButtons();
}
