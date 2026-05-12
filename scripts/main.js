const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");
const storedTheme = window.localStorage.getItem("cielostitch-theme");

if (storedTheme) {
  root.dataset.theme = storedTheme;
}

const syncThemeButton = () => {
  const isLight = root.dataset.theme === "light";
  themeToggle?.setAttribute("aria-pressed", String(isLight));
};

syncThemeButton();

themeToggle?.addEventListener("click", () => {
  const nextTheme = root.dataset.theme === "light" ? "dark" : "light";
  if (nextTheme === "dark") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = nextTheme;
  }
  window.localStorage.setItem("cielostitch-theme", nextTheme);
  syncThemeButton();
});
