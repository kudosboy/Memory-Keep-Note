"use strict";

(() => {
  const page = location.pathname === "/" ? "index.html" : location.pathname.split("/").pop();
  const excluded = "script,style,noscript,svg,textarea,input,select,option,[contenteditable='true'],[data-site-content-ignore],#siteAnnouncement,#founderProfile,#notesList,#bodyInput,#titleInput,#noteTags,#attachmentList,#accountRows,#content,#title,.stats,#message,#saveState,#updatedAt,#wordCount,.note-preview,.note-title,.note-card,.content-status";
  const overrides = {};
  const originals = new WeakMap();
  let latestIndex = "";
  let observerTimer = 0;

  function classesFor(element) {
    return [...element.classList].filter(name => !["active", "open", "loading", "sidebar-open", "hidden"].includes(name)).sort().join(".");
  }

  function elementPath(element) {
    const parts = [];
    for (let current = element; current && current !== document.body; current = current.parentElement) {
      const tag = current.tagName.toLowerCase();
      const parent = current.parentElement;
      if (!parent) {
        parts.unshift(`${tag}.${classesFor(current)}:0`);
        break;
      }
      if (current.id) {
        parts.unshift(`${tag}#${current.id}`);
        continue;
      }
      const classes = classesFor(current);
      const signature = `${tag}.${classes}`;
      const siblings = [...parent.children].filter(sibling =>
        sibling.tagName.toLowerCase() === tag && classesFor(sibling) === classes
      );
      parts.unshift(`${signature}:${siblings.indexOf(current)}`);
    }
    return parts.join("/");
  }

  function collectTextNodes() {
    const nodes = [];
    const textNodes = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node; (node = walker.nextNode()) && textNodes.length < 499;) textNodes.push(node);
    const titleNode = document.head.querySelector("title")?.firstChild;
    if (titleNode?.nodeType === Node.TEXT_NODE) textNodes.push(titleNode);
    for (const node of textNodes) {
      const parent = node.parentElement;
      if (!parent || parent.closest(excluded)) continue;
      if (!originals.has(node)) originals.set(node, node.nodeValue);
      const defaultText = originals.get(node);
      if (!defaultText.trim()) continue;
      let textIndex = 0;
      for (let sibling = parent.firstChild; sibling && sibling !== node; sibling = sibling.nextSibling) {
        if (sibling.nodeType === Node.TEXT_NODE) textIndex += 1;
      }
      const key = `${elementPath(parent)}/text:${textIndex}`;
      nodes.push({ node, key, defaultText });
    }
    return nodes;
  }

  function applyOverrides(next = overrides, replace = false, notify = true) {
    if (replace) {
      Object.keys(overrides).forEach(key => delete overrides[key]);
      Object.assign(overrides, next);
    } else {
      Object.assign(overrides, next);
    }
    const nodes = collectTextNodes();
    nodes.forEach(({ node, key }) => {
      const value = Object.hasOwn(overrides, key) ? overrides[key] : originals.get(node);
      if (node.nodeValue !== value) node.nodeValue = value;
    });
    if (notify && window.parent !== window) sendIndex(nodes);
  }

  function sendIndex(nodes) {
    const items = nodes.map(({ node, key, defaultText }) => ({
      key,
      text: node.nodeValue,
      defaultText
    }));
    const fingerprint = JSON.stringify(items);
    if (fingerprint === latestIndex) return;
    latestIndex = fingerprint;
    window.parent.postMessage({ type: "mkn:site-content-index", page, items }, location.origin);
  }

  function addAnnouncement(announcement) {
    if (!announcement?.enabled || !announcement.message || document.querySelector("#siteAnnouncement")) return;
    const banner = document.createElement("aside");
    banner.id = "siteAnnouncement";
    banner.className = `site-announcement ${announcement.tone || "info"}`;
    banner.setAttribute("role", "status");
    const message = document.createElement("span");
    message.textContent = announcement.message;
    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss announcement");
    close.textContent = "×";
    close.addEventListener("click", () => {
      banner.remove();
      document.body.style.paddingTop = "";
    });
    banner.append(message, close);
    document.body.appendChild(banner);
    const height = Math.ceil(banner.getBoundingClientRect().height);
    document.body.style.paddingTop = `${height + 12}px`;
  }

  function applyProfile(profile) {
    const card = document.querySelector("#founderProfile");
    if (!card || !profile || typeof profile !== "object") return;
    const photo = document.querySelector("#founderPhoto");
    const placeholder = document.querySelector("#founderPlaceholder");
    const name = typeof profile.name === "string" ? profile.name.trim() : "";
    const role = typeof profile.role === "string" ? profile.role.trim() : "";
    const badge = typeof profile.badge === "string" ? profile.badge.trim() : "";
    const eyebrow = typeof profile.eyebrow === "string" ? profile.eyebrow.trim() : "";
    const photoUrl = typeof profile.photoUrl === "string" && /^\/api\/site-content\/profile-image\/[a-f0-9]{24}$/i.test(profile.photoUrl) ? profile.photoUrl : "";
    const positionX = Number.isInteger(profile.imagePositionX) ? Math.min(100, Math.max(0, profile.imagePositionX)) : 50;
    const positionY = Number.isInteger(profile.imagePositionY) ? Math.min(100, Math.max(0, profile.imagePositionY)) : 50;
    document.querySelector("#founderName").textContent = name || "Memory Keep Note";
    document.querySelector("#founderRole").textContent = role;
    document.querySelector("#founderRole").hidden = !role;
    document.querySelector("#founderBadge").textContent = badge;
    document.querySelector("#founderBadge").hidden = !badge;
    document.querySelector("#founderEyebrow").textContent = eyebrow;
    photo.alt = typeof profile.alt === "string" && profile.alt.trim() ? profile.alt : name || "Profile photo";
    photo.style.objectPosition = `${positionX}% ${positionY}%`;
    photo.hidden = !photoUrl;
    placeholder.hidden = Boolean(photoUrl);
    if (photoUrl) photo.src = photoUrl;
    else photo.removeAttribute("src");
    card.hidden = profile.enabled === false || (!name && !photoUrl);
  }

  window.addEventListener("mkn:announcement-updated", event => {
    document.querySelector("#siteAnnouncement")?.remove();
    document.body.style.paddingTop = "";
    addAnnouncement(event.detail);
  });

  const announcementStyle = document.createElement("style");
  announcementStyle.textContent = `
    .site-announcement{position:fixed;z-index:10000;top:8px;left:50%;transform:translateX(-50%);display:flex;align-items:center;justify-content:center;gap:14px;width:min(760px,calc(100% - 24px));padding:10px 14px;border:1px solid #ffffff30;border-radius:14px;background:#25223a;color:#fff;box-shadow:0 10px 32px #0007;font:14px/1.45 system-ui,sans-serif}
    .site-announcement.success{background:#123a30}.site-announcement.warning{background:#493313}
    .site-announcement button{flex:0 0 auto;width:28px;height:28px;padding:0;border:0;border-radius:8px;background:#ffffff14;color:inherit;font:22px/1 system-ui,sans-serif;cursor:pointer}
  `;
  document.head.appendChild(announcementStyle);

  window.addEventListener("message", event => {
    if (event.origin !== location.origin || event.source !== window.parent) return;
    if (event.data?.type === "mkn:site-content-preview") applyOverrides(event.data.overrides || {}, true, false);
    if (event.data?.type === "mkn:site-profile-preview") applyProfile(event.data.profile);
  });

  if (window.parent !== window) {
    window.addEventListener("load", () => {
      sendIndex(collectTextNodes());
    }, { once: true });
  }

  fetch("/api/site-content", { cache: "no-store" }).then(response => {
    if (!response.ok) throw new Error(`Site content unavailable (${response.status}).`);
    return response.json();
  }).then(content => {
    if (content.pages?.[page] && typeof content.pages[page] === "object") {
      Object.assign(overrides, content.pages[page]);
      applyOverrides();
    }
    addAnnouncement(content.announcement);
    applyProfile(content.profile);
  }).catch(error => console.warn("Could not load published website content.", error));

  const observer = new MutationObserver(() => {
    clearTimeout(observerTimer);
    observerTimer = setTimeout(() => applyOverrides(), 80);
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
