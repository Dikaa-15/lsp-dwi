# User Orders Tabs and Customer Completion Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the "mark as finished" action from admin to the customer order page and add status tabs to customer order history.

**Architecture:** The customer orders page will render server-side filtered by a `tab` query param, with tab counts derived from the full order list for the signed-in user. Admin order management will remain responsible for verification and shipping only; finishing an order becomes a customer-only action with a dedicated route guarded by ownership and current status checks.

**Tech Stack:** Express, EJS, MySQL, session auth, fetch API

---

### Task 1: Add customer-side order completion route

**Files:**
- Modify: `routes/users.js`

- [ ] **Step 1: Write the failing test**

```js
// Pseudocode: route should reject non-owned orders and only allow marking a shipped order as done.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk node --check routes/users.js`
Expected: pass syntax, but route behavior is still missing.

- [ ] **Step 3: Write minimal implementation**

```js
router.post('/pesanan/:id/selesai', isCustomer, (req, res) => {
  db.query(
    'UPDATE pembelian SET status = "selesai" WHERE id_pembelian = ? AND user_id = ? AND status = "dikirim"',
    [req.params.id, req.session.user.id],
    (err, result) => {
      if (err) return res.json({ success: false, message: err.message });
      if (!result.affectedRows) {
        return res.json({ success: false, message: 'Pesanan tidak dapat ditandai selesai' });
      }
      return res.json({ success: true, message: 'Pesanan berhasil ditandai selesai' });
    }
  );
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `rtk node --check routes/users.js`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add routes/users.js
git commit -m "feat: add customer order completion route"
```

### Task 2: Add status tabs and customer action to order history

**Files:**
- Modify: `routes/users.js`
- Modify: `views/users/pesanan.ejs`

- [ ] **Step 1: Write the failing test**

```js
// Pseudocode: customer order page should accept ?tab=dikirim and only render shipped orders.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk node -e "/* render smoke test for views/users/pesanan.ejs with activeTab and tabCounts */"`
Expected: render succeeds after implementation.

- [ ] **Step 3: Write minimal implementation**

```js
// routes/users.js
const tab = (req.query.tab || 'semua').toLowerCase();
const allowedTabs = new Set(['semua', 'menunggu_verifikasi', 'diproses', 'dikirim', 'selesai', 'dibatalkan']);
const activeTab = allowedTabs.has(tab) ? tab : 'semua';
const counts = orders.reduce((acc, order) => {
  acc.semua += 1;
  acc[order.status] = (acc[order.status] || 0) + 1;
  return acc;
}, { semua: 0, menunggu_verifikasi: 0, diproses: 0, dikirim: 0, selesai: 0, dibatalkan: 0 });
const filteredOrders = activeTab === 'semua' ? orders : orders.filter(order => order.status === activeTab);
```

```ejs
<% const tabs = [
  { key: 'semua', label: 'Semua' },
  { key: 'menunggu_verifikasi', label: 'Menunggu Verifikasi' },
  { key: 'diproses', label: 'Diproses' },
  { key: 'dikirim', label: 'Dikirim' },
  { key: 'selesai', label: 'Selesai' },
  { key: 'dibatalkan', label: 'Dibatalkan' }
]; %>
<% tabs.forEach(tab => { %>
  <a href="/users/pesanan?tab=<%= tab.key %>" class="<%= activeTab === tab.key ? '...' : '...' %>">
    <%= tab.label %>
    <span><%= tabCounts[tab.key] || 0 %></span>
  </a>
<% }) %>
```

```ejs
<% if (o.status === 'dikirim') { %>
  <button onclick="markAsDone('<%= o.id_pembelian %>')">Tandai Selesai</button>
<% } %>
```

```js
function markAsDone(id) {
  fetch(`/users/pesanan/${id}/selesai`, { method: 'POST' })
    .then(res => res.json())
    .then(data => { if (data.success) location.reload(); else alert(data.message); });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `rtk node -e "/* render smoke test for views/users/pesanan.ejs */"`
Expected: pass and show tabs plus customer action button on shipped orders.

- [ ] **Step 5: Commit**

```bash
git add routes/users.js views/users/pesanan.ejs
git commit -m "feat: add customer order tabs"
```

### Task 3: Remove finish action from admin and keep shipping flow intact

**Files:**
- Modify: `routes/admin.js`
- Modify: `views/admin/pesanan.ejs`

- [ ] **Step 1: Write the failing test**

```js
// Pseudocode: admin modal should not render a "Tandai Selesai" action for shipped orders.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk node --check routes/admin.js`
Expected: pass syntax, but UI still exposes the wrong action until the view is updated.

- [ ] **Step 3: Write minimal implementation**

```js
// routes/admin.js
if (status === 'selesai') {
  return res.json({ success: false, message: 'Penyelesaian pesanan dilakukan oleh customer' });
}
```

```ejs
<% } else if (status === 'dikirim') { %>
  <div class="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
    Pesanan sudah dikirim. Menunggu customer menandai selesai.
  </div>
<% } %>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `rtk node --check routes/admin.js`
Expected: pass, and the admin modal only shows verification and shipping actions.

- [ ] **Step 5: Commit**

```bash
git add routes/admin.js views/admin/pesanan.ejs
git commit -m "feat: move order completion to customer flow"
```

### Task 4: Verify the rendered views

**Files:**
- No code changes expected

- [ ] **Step 1: Render smoke tests for the edited templates**

```js
// Render checkout, admin order modal, and user orders with representative locals.
```

- [ ] **Step 2: Run the smoke tests**

Run:
`rtk node -e "/* render EJS smoke tests for views/users/pesanan.ejs and views/admin/pesanan.ejs */"`
Expected: no template errors, no missing locals, tabs render, customer completion button shows only for shipped orders.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-04-29-user-orders-tabs-completion.md
git commit -m "docs: add implementation plan for customer order flow"
```
