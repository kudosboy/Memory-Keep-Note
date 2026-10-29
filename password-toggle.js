(() => {
  "use strict";
  const style = document.createElement("style");
  style.textContent = ".password-field{position:relative;display:block;width:100%}.password-field input{padding-right:48px!important}.password-toggle{position:absolute!important;right:5px!important;top:50%!important;transform:translateY(-50%)!important;display:grid!important;place-items:center!important;width:38px!important;height:34px!important;margin:0!important;padding:0!important;border:0!important;border-radius:8px!important;background:rgba(255,255,255,.10)!important;color:#fff!important;box-shadow:none!important;font-size:18px!important;line-height:1!important;cursor:pointer!important;z-index:2!important}.password-toggle:hover,.password-toggle:focus-visible{background:rgba(139,123,255,.45)!important;outline:2px solid rgba(139,123,255,.7)!important;outline-offset:1px}";
  document.head.appendChild(style);
  document.querySelectorAll('input[type="password"]').forEach((input) => {
    if (input.dataset.passwordToggle) return;
    input.dataset.passwordToggle = "true";
    const wrapper = document.createElement("span");
    wrapper.className = "password-field";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "password-toggle";
    toggle.setAttribute("aria-label", "Show password");
    toggle.setAttribute("aria-pressed", "false");
    toggle.textContent = "👁";
    toggle.addEventListener("click", () => {
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      toggle.textContent = visible ? "👁" : "🙈";
      toggle.setAttribute("aria-label", visible ? "Show password" : "Hide password");
      toggle.setAttribute("aria-pressed", String(!visible));
    });
    wrapper.appendChild(toggle);
  });
})();
