<template>
  <div class="trust-section">
    <div class="trust-badges">
      <div class="badge-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span>SSL 加密传输</span>
      </div>
      <div class="badge-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span>数据安全保护</span>
      </div>
      <div class="badge-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>7 天无理由退款</span>
      </div>
      <div class="badge-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>24 小时客服支持</span>
      </div>
    </div>

    <div class="payment-methods">
      <span class="pm-label">支持支付方式：</span>
      <div class="pm-icons">
        <span class="pm-icon" title="支付宝">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.422 15.358c-3.14-1.356-5.263-2.302-5.263-2.302s1.387-3.135 1.67-4.791c.283-1.656-.134-2.831-1.263-2.944-1.129-.113-1.758.645-2.04 1.883-.253 1.1-.643 3.042-1.023 4.35a31.054 31.054 0 01-3.072-2.18c-.827-.726-1.242-1.453-1.242-2.422 0-1.129.776-2.33 2.695-2.33 1.355 0 2.17.403 2.17.403V3.083s-1.413-.32-2.896-.32c-3.537 0-5.314 2.058-5.314 4.576 0 1.474.55 2.654 1.645 3.59.775.665 1.888 1.39 3.18 2.18-.383.907-.867 1.833-1.478 2.726-1.513 2.213-3.333 4.102-3.333 4.102l1.96 1.697s1.92-2.058 3.51-4.69c.14-.23.273-.46.4-.69 1.97.933 4.186 1.86 6.78 2.637 2.483.745 3.314-1.08 3.314-1.08l.022-.044c-1.367-.533-2.758-1.138-4.142-1.609z"/></svg>
        </span>
        <span class="pm-icon" title="微信支付">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.691 2C4.329 2 .726 4.943.726 8.596c0 2.064 1.112 3.904 2.855 5.13l-.716 2.138 2.49-1.254c.858.234 1.762.36 2.7.36h.298c-.075-.332-.116-.674-.116-1.024 0-3.515 3.32-6.364 7.417-6.364.217 0 .43.012.643.03C15.83 4.304 12.558 2 8.69 2z"/></svg>
        </span>
        <span class="pm-icon" title="银联">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18a1 1 0 011 1v14a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1zm1 2v12h16V6H4zm3 3h4v2H7V9zm0 4h10v2H7v-2z"/></svg>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trust-section {
  max-width: 800px;
  width: 100%;
  margin-top: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.trust-badges {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
  justify-content: center;
}

.badge-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.badge-item svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.payment-methods {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pm-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.pm-icons {
  display: flex;
  gap: 8px;
}

.pm-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  transition: all 0.2s;
}

.pm-icon:hover {
  background: rgba(255,255,255,0.08);
  color: var(--color-text-secondary);
}

.pm-icon svg {
  width: 16px;
  height: 16px;
}

@media (max-width: 600px) {
  .trust-badges {
    gap: 16px;
  }
}
</style>
