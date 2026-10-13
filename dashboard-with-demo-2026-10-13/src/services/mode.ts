// /demo/ serves the fake-data ledger; everything else is the real platform.
export const isDemo = () => window.location.pathname.startsWith('/demo')
