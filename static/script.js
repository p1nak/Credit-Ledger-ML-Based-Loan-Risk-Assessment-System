/* ==========================================================================
   CREDIT LEDGER — NEO-FINTECH: MIDNIGHT AURORA CLIENT-SIDE LOGIC
   Calibrated Machine Learning Underwriting Engine
   ========================================================================== */

(() => {
  "use strict";

  /* --- 1. Constants & Metric Dimensions --------------------------------- */
  // Gauge radius r = 90px in SVG, circumference = 2 * PI * 90 ≈ 565.487
  const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 90;

  /* --- 2. DOM Elements --------------------------------------------------- */
  const form            = document.getElementById("riskForm");
  const submitBtn       = document.getElementById("submitBtn");
  const errorNote       = document.getElementById("errorNote");
  const verdict         = document.getElementById("verdict");

  // Inputs
  const ageInput        = document.getElementById("person_age");
  const incomeInput     = document.getElementById("person_income");
  const ownershipSelect = document.getElementById("person_home_ownership");
  const empLengthInput  = document.getElementById("person_emp_length");

  const intentSelect    = document.getElementById("loan_intent");
  const gradeSelect     = document.getElementById("loan_grade");
  const amountInput     = document.getElementById("loan_amnt");
  const rateInput       = document.getElementById("loan_int_rate");
  const percentInput    = document.getElementById("loan_percent_income");
  const ratioBadge      = document.getElementById("ratioBadge");

  const defaultSelect   = document.getElementById("cb_person_default_on_file");
  const credHistInput   = document.getElementById("cb_person_cred_hist_length");

  // Gauge & Verdict
  const gaugeFill       = document.getElementById("gaugeFill");
  const gaugeThreshold  = document.getElementById("gaugeThreshold");
  const probNumber      = document.getElementById("probNumber");
  const stampBadge      = document.getElementById("stampBadge");
  const stampText       = document.getElementById("stampText");
  const stampIconWrap   = document.getElementById("stampIconWrap");

  // Spectrum & Analytics
  const spectrumMarker  = document.getElementById("spectrumMarker");
  const spectrumText    = document.getElementById("spectrumMarkerText");
  const factProb        = document.getElementById("factProb");
  const factThreshold   = document.getElementById("factThreshold");
  const factResult      = document.getElementById("factResult");
  const recBox          = document.getElementById("recommendationBox");
  const recIcon         = document.getElementById("recIcon");
  const recHeadline     = document.getElementById("recHeadline");
  const recDesc         = document.getElementById("recDesc");
  const verdictTime     = document.getElementById("verdictTimestamp");

  // Utility Controls
  const apiDot          = document.getElementById("apiDot");
  const apiStatusText   = document.getElementById("apiStatusText");
  const btnResetForm    = document.getElementById("btnResetForm");
  const btnScrollForm   = document.getElementById("btnScrollForm");
  const presetPrime     = document.getElementById("presetPrime");
  const presetSubprime  = document.getElementById("presetSubprime");
  const menuToggle      = document.getElementById("menuToggle");
  const sidebar         = document.getElementById("sidebar");

  // Modal
  const btnModelInfo    = document.getElementById("btnModelInfo");
  const modelModal      = document.getElementById("modelModal");
  const btnCloseModal   = document.getElementById("btnCloseModal");

  /* --- 3. Dynamic Ambient Canvas Particles -------------------------------- */
  function initAmbientParticles() {
    const canvas = document.getElementById("auroraCanvas");
    if (!canvas) return;

    // Respect reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      canvas.style.display = "none";
      return;
    }

    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener("resize", () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const PARTICLE_COUNT = Math.min(50, Math.floor(window.innerWidth / 28));

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.8 + 0.6,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        color: Math.random() > 0.5 ? "rgba(0, 217, 255," : "rgba(139, 92, 246,",
        alpha: Math.random() * 0.45 + 0.15,
      });
    }

    function render() {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color} ${p.alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color + " 0.8)";
        ctx.fill();
      }

      requestAnimationFrame(render);
    }

    render();
  }

  /* --- 4. Auto-Calculate Loan-to-Income Ratio ---------------------------- */
  function recalcPercent() {
    const income = parseFloat(incomeInput.value);
    const amount = parseFloat(amountInput.value);

    if (income > 0 && amount >= 0) {
      const ratio = amount / income;
      percentInput.value = ratio.toFixed(2);

      if (ratioBadge) {
        const pct = Math.round(ratio * 100);
        if (ratio <= 0.25) {
          ratioBadge.textContent = `Optimal: ${pct}%`;
          ratioBadge.style.color = "var(--low-risk)";
          ratioBadge.style.borderColor = "rgba(34, 230, 168, 0.3)";
        } else if (ratio <= 0.45) {
          ratioBadge.textContent = `Moderate: ${pct}%`;
          ratioBadge.style.color = "var(--cyan)";
          ratioBadge.style.borderColor = "rgba(0, 217, 255, 0.3)";
        } else {
          ratioBadge.textContent = `Elevated: ${pct}%`;
          ratioBadge.style.color = "var(--high-risk)";
          ratioBadge.style.borderColor = "rgba(255, 85, 118, 0.3)";
        }
      }
    }
  }

  incomeInput.addEventListener("input", recalcPercent);
  amountInput.addEventListener("input", recalcPercent);
  recalcPercent();

  /* --- 5. API Health Check ----------------------------------------------- */
  async function checkApiHealth() {
    try {
      const start = performance.now();
      const res = await fetch("/openapi.json");
      const elapsed = Math.round(performance.now() - start);

      if (res.ok) {
        apiDot.className = "status-pulse-dot ok";
        apiStatusText.textContent = `Engine Online (${elapsed}ms)`;
      } else {
        throw new Error();
      }
    } catch {
      apiDot.className = "status-pulse-dot down";
      apiStatusText.textContent = "Engine Offline";
    }
  }
  checkApiHealth();

  /* --- 6. Form Validation & Error Handling -------------------------------- */
  function showError(message) {
    const msgEl = errorNote.querySelector(".error-message") || errorNote;
    msgEl.textContent = message;
    errorNote.hidden = false;
    errorNote.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function clearError() {
    errorNote.hidden = true;
    const msgEl = errorNote.querySelector(".error-message");
    if (msgEl) msgEl.textContent = "";
  }

  function validateForm() {
    const age      = parseInt(ageInput.value, 10);
    const income   = parseFloat(incomeInput.value);
    const empLen   = parseFloat(empLengthInput.value);
    const loanAmnt = parseFloat(amountInput.value);
    const intRate  = parseFloat(rateInput.value);
    const lpi      = parseFloat(percentInput.value);
    const credHist = parseInt(credHistInput.value, 10);

    if (isNaN(age) || age < 18 || age > 100 || !Number.isInteger(age)) {
      return { valid: false, message: "Borrower age must be a whole number between 18 and 100." };
    }
    if (isNaN(income) || income <= 0) {
      return { valid: false, message: "Annual income must be greater than ₹0." };
    }
    if (isNaN(empLen) || empLen < 0) {
      return { valid: false, message: "Employment length cannot be negative." };
    }
    if (isNaN(loanAmnt) || loanAmnt <= 0) {
      return { valid: false, message: "Requested loan amount must be greater than ₹0." };
    }
    if (isNaN(intRate) || intRate <= 0 || intRate > 40) {
      return { valid: false, message: "Interest rate must be between 0% and 40% APR." };
    }
    if (isNaN(lpi) || lpi < 0 || lpi > 1) {
      return { valid: false, message: "Loan-to-income ratio must fall between 0.00 and 1.00." };
    }
    if (isNaN(credHist) || credHist < 0) {
      return { valid: false, message: "Credit history duration cannot be negative." };
    }

    return { valid: true, message: "" };
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle("loading", isLoading);
    const label = submitBtn.querySelector(".btn-label");
    if (label) {
      label.textContent = isLoading ? "Analyzing Risk Profile…" : "Analyze Credit Risk";
    }
  }

  /* --- 7. Numeric Count-Up Animation (easeOutExpo) ------------------------ */
  function animateNumber(el, from, to, duration = 1200) {
    const start = performance.now();
    function tick(now) {
      const elapsed = Math.min(1, (now - start) / duration);
      // easeOutExpo
      const eased = elapsed === 1 ? 1 : 1 - Math.pow(2, -10 * elapsed);
      const val = from + (to - from) * eased;
      el.textContent = val.toFixed(1);

      if (elapsed < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = to.toFixed(1);
      }
    }
    requestAnimationFrame(tick);
  }

  /* --- 8. Render Prediction Verdict -------------------------------------- */
  function renderVerdict(data) {
    const probabilityPct = data.default_probability * 100;
    const thresholdPct   = data.threshold * 100;
    const isHighRisk     = data.default_prediction === 1;

    // Reveal verdict container
    verdict.hidden = false;
    verdict.scrollIntoView({ behavior: "smooth", block: "start" });

    // Update timestamp
    if (verdictTime) {
      const now = new Date();
      verdictTime.textContent = `Inferred ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    }

    // 1. Neon Circular Gauge
    const offset = GAUGE_CIRCUMFERENCE * (1 - probabilityPct / 100);
    gaugeFill.style.stroke = isHighRisk ? "url(#gaugeCoral)" : "url(#gaugeEmerald)";
    requestAnimationFrame(() => {
      gaugeFill.style.strokeDashoffset = offset;
    });

    // Rotate threshold tick mark (360 degrees full circle)
    gaugeThreshold.style.transform = `rotate(${thresholdPct * 3.6}deg)`;

    // Count up probability percentage
    animateNumber(probNumber, 0, probabilityPct, 1200);

    // 2. Risk Stamp Badge
    stampBadge.classList.remove("stamp--in", "risk-high");
    void stampBadge.offsetWidth; // Force reflow to restart animation

    if (isHighRisk) {
      stampBadge.classList.add("risk-high");
      stampText.textContent = "HIGH RISK — EXPOSURE";
    } else {
      stampText.textContent = "LOW RISK — APPROVED";
    }
    requestAnimationFrame(() => stampBadge.classList.add("stamp--in"));

    // Update Stamp Icon
    if (stampIconWrap) {
      stampIconWrap.innerHTML = `<i data-lucide="${isHighRisk ? 'shield-alert' : 'shield-check'}" class="stamp-icon"></i>`;
    }

    // 3. Decision Spectrum Marker Position
    if (spectrumMarker) {
      const clampedPct = Math.min(100, Math.max(0, probabilityPct));
      spectrumMarker.style.left = `${clampedPct}%`;
      if (spectrumText) {
        spectrumText.textContent = `${probabilityPct.toFixed(1)}%`;
      }
    }

    // 4. Metric Fact Tiles
    factProb.textContent      = `${probabilityPct.toFixed(1)}%`;
    factThreshold.textContent = `${thresholdPct.toFixed(1)}%`;
    factResult.textContent    = data.Result;

    // 5. Contextual Recommendation Box
    if (recBox && recHeadline && recDesc && recIcon) {
      if (isHighRisk) {
        recBox.classList.add("risk-high");
        recIcon.innerHTML = `<i data-lucide="alert-octagon"></i>`;
        recHeadline.textContent = "Elevated Credit Delinquency Risk";
        recDesc.textContent = `The applicant's computed default probability (${probabilityPct.toFixed(1)}%) breaches the conservative model threshold (${thresholdPct.toFixed(1)}%). Underwriting policy recommends manual exposure review or required collateral enhancement.`;
      } else {
        recBox.classList.remove("risk-high");
        recIcon.innerHTML = `<i data-lucide="shield-check"></i>`;
        recHeadline.textContent = "Optimal Risk Profile — Standard Issuance";
        recDesc.textContent = `The applicant's computed default probability (${probabilityPct.toFixed(1)}%) is comfortably below the decision threshold (${thresholdPct.toFixed(1)}%). Facility recommended for automated approval under prime tier terms.`;
      }
    }

    // Re-render Lucide icons
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

  /* --- 9. Form Submission Handler ---------------------------------------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const validation = validateForm();
    if (!validation.valid) {
      showError(validation.message);
      return;
    }

    setLoading(true);

    // Exact 11 payload fields matching FastAPI schema
    const payload = {
      person_age:                 parseInt(ageInput.value, 10),
      person_income:              parseFloat(incomeInput.value),
      person_home_ownership:      ownershipSelect.value,
      person_emp_length:          parseFloat(empLengthInput.value),
      loan_intent:                intentSelect.value,
      loan_grade:                 gradeSelect.value,
      loan_amnt:                  parseFloat(amountInput.value),
      loan_int_rate:              parseFloat(rateInput.value),
      loan_percent_income:        parseFloat(percentInput.value),
      cb_person_default_on_file:  defaultSelect.value,
      cb_person_cred_hist_length: parseInt(credHistInput.value, 10),
    };

    try {
      const res = await fetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const detail = body && body.detail ? JSON.stringify(body.detail) : `HTTP Error ${res.status}`;
        throw new Error(detail);
      }

      const data = await res.json();
      renderVerdict(data);
    } catch (err) {
      showError(`Underwriting engine call failed: ${err.message || "Please verify backend service is reachable."}`);
    } finally {
      setLoading(false);
    }
  });

  /* --- 10. Interactive Presets (Prime & Subprime) ------------------------- */
  if (presetPrime) {
    presetPrime.addEventListener("click", () => {
      ageInput.value        = 32;
      incomeInput.value     = 850000;
      ownershipSelect.value = "MORTGAGE";
      empLengthInput.value  = 7;
      intentSelect.value    = "DEBTCONSOLIDATION";
      gradeSelect.value     = "A";
      amountInput.value     = 120000;
      rateInput.value       = 8.5;
      defaultSelect.value   = "N";
      credHistInput.value   = 9;

      recalcPercent();
      clearError();
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (presetSubprime) {
    presetSubprime.addEventListener("click", () => {
      ageInput.value        = 22;
      incomeInput.value     = 25000;
      ownershipSelect.value = "RENT";
      empLengthInput.value  = 0.5;
      intentSelect.value    = "PERSONAL";
      gradeSelect.value     = "G";
      amountInput.value     = 22000;
      rateInput.value       = 24.5;
      defaultSelect.value   = "Y";
      credHistInput.value   = 1;

      recalcPercent();
      clearError();
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* --- 11. Utility Buttons & Navigation ---------------------------------- */
  if (btnResetForm) {
    btnResetForm.addEventListener("click", () => {
      form.reset();
      recalcPercent();
      clearError();
      verdict.hidden = true;
    });
  }

  if (btnScrollForm) {
    btnScrollForm.addEventListener("click", () => {
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Mobile menu drawer
  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("mobile-open");
    });
  }

  // Model Info Modal
  if (btnModelInfo && modelModal && btnCloseModal) {
    btnModelInfo.addEventListener("click", () => {
      modelModal.hidden = false;
    });

    btnCloseModal.addEventListener("click", () => {
      modelModal.hidden = true;
    });

    modelModal.addEventListener("click", (e) => {
      if (e.target === modelModal) modelModal.hidden = true;
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modelModal.hidden) {
        modelModal.hidden = true;
      }
    });
  }

  /* --- 12. Initialization ------------------------------------------------ */
  window.addEventListener("DOMContentLoaded", () => {
    initAmbientParticles();
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  });

  // Also call icons immediately in case DOM is already ready
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
})();
