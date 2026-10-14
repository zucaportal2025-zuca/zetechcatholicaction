import {
  enable,
  disable,
  isEnabled,
  setFetchMethod,
} from "darkreader";

setFetchMethod(window.fetch);

const options = {
  brightness: 100,
  contrast: 90,
  sepia: 0,
};

export const enableDark = () => enable(options);

export const disableDark = () => disable();

export const toggleDark = () => {
  if (isEnabled()) {
    disableDark();
    localStorage.setItem("theme", "light");
  } else {
    enableDark();
    localStorage.setItem("theme", "dark");
  }
};

export const initializeDark = () => {
  const theme = localStorage.getItem("theme");

  if (theme === "dark") {
    enableDark();
  }
};