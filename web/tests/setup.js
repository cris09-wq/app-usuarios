import { afterEach, vi } from "vitest"

afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    document.body.innerHTML = ""
})