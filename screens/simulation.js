function renderSimulation() {
  return `
    <div class="card">
      <h1 class="title">Simulation</h1>
      <p class="subtitle">Applied finance practice placeholder.</p>
    </div>

    <div class="card">
      <div class="section-title">Loan Tradeoff Practice</div>
      <p class="helper">Estimate which loan creates less long-term pressure.</p>
      <div class="item-card"><strong>Option A</strong><br><span class="helper">Lower monthly payment, higher APR.</span></div>
      <div class="item-card"><strong>Option B</strong><br><span class="helper">Higher monthly payment, lower APR.</span></div>
    </div>

    <button class="button full" type="button" onclick="completeLesson()">Complete Simulation</button>
  `;
}
