import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

let visitorId = localStorage.getItem('demo-visitor-id');
let accountId = localStorage.getItem('demo-account-id');
const isNewVisitor = !visitorId;
const isNewAccount = !accountId;

if (!visitorId) {
  visitorId = 'visitor-' + Math.random().toString(36).slice(2);
  localStorage.setItem('demo-visitor-id', visitorId);
}
if (!accountId) {
  accountId = 'account-' + Math.random().toString(36).slice(2);
  localStorage.setItem('demo-account-id', accountId);
}

pendo.initialize({
  visitor: {
    id: visitorId,
  },
  account: {
    id: accountId,
  },
  sessionReplay: { isActive: true },
});

// Track Event: fires once, on the first load where a random visitor ID and/or
// account ID is generated and stored in localStorage. The stored IDs act as a
// persistent guard, so later loads in the same browser don't re-fire it.
if (isNewVisitor || isNewAccount) {
  pendo.track('Visitor identified', {
    is_new_visitor: isNewVisitor,
    is_new_account: isNewAccount,
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
