// Where this copy of MoonMax Book is running. Only changes wording about where data is kept.
export const isDeployed = () => !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)
